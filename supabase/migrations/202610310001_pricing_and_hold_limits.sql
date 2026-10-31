-- Cotización de laboratorio. El anticipo es ilustrativo; no verifica ni procesa pagos.
begin;
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts(id),
  title text not null check (length(btrim(title)) between 1 and 80),
  percent integer not null check (percent between 1 and 99),
  valid_from date not null,
  valid_until date not null,
  weekdays integer[] not null check (cardinality(weekdays)>0 and weekdays <@ array[0,1,2,3,4,5,6]),
  from_minute integer not null check (from_minute between 0 and 1410 and from_minute%30=0),
  until_minute integer not null check (until_minute between 30 and 1440 and until_minute%30=0),
  max_uses integer not null check (max_uses between 1 and 100000),
  enabled boolean not null default false,
  funded_by text not null default 'venue' check (funded_by='venue'),
  check (valid_from<=valid_until),
  check (from_minute<until_minute)
);
create index promotions_court on public.promotions(court_id);
alter table public.promotions enable row level security;
create policy promotions_read on public.promotions for select to anon,authenticated using (
  exists(select 1 from public.courts c join public.venues v on v.id=c.venue_id
    where c.id=court_id and ((enabled and c.published and v.published) or public.is_venue_member(c.venue_id)))
);
revoke all on public.promotions from anon,authenticated;
grant select on public.promotions to anon,authenticated;

alter table public.reservations
  add column base_price integer,
  add column discount integer,
  add column deposit integer,
  add column balance integer,
  add column promotion_id uuid references public.promotions(id),
  add column promotion_title text,
  add column promotion_percent integer,
  add column discount_funder text;
update public.reservations set base_price=total,discount=0,
  deposit=round(total::numeric*30/100)::integer,
  balance=total-round(total::numeric*30/100)::integer;
alter table public.reservations
  alter column base_price set not null,
  alter column discount set not null,
  alter column deposit set not null,
  alter column balance set not null,
  add constraint reservation_price_consistent check (
    base_price>=0 and discount between 0 and base_price and total=base_price-discount
    and deposit>=0 and balance>=0 and total=deposit+balance
    and ((promotion_id is null and promotion_title is null and promotion_percent is null and discount_funder is null)
      or (promotion_id is not null and promotion_title is not null and promotion_percent is not null
        and discount_funder is not null and promotion_percent between 1 and 99 and discount_funder='venue'))
  );
create index reservations_promotion on public.reservations(promotion_id) where promotion_id is not null;

create function public.quote_slot(p_court uuid,p_date date,p_time time,p_duration integer)
returns table(base_price integer,discount integer,total integer,deposit integer,balance integer,
  promotion_id uuid,promotion_title text,promotion_percent integer,discount_funder text)
language plpgsql stable security definer set search_path = '' as $$
declare court public.courts; promo public.promotions; minute integer; start_at timestamptz;
begin
  if p_date is null or p_time is null or p_duration is null or p_duration not in (30,60,90,120)
    or extract(second from p_time)<>0 or extract(minute from p_time)::integer%30<>0 then
    raise exception 'invalid_input' using errcode='22023';
  end if;
  select * into court from public.courts where id=p_court;
  if not found or (not public.is_venue_member(court.venue_id) and (not court.published or not exists(select 1 from public.venues v where v.id=court.venue_id and v.published))) then
    raise exception 'court_unavailable' using errcode='22023';
  end if;
  minute := extract(hour from p_time)::integer*60+extract(minute from p_time)::integer;
  start_at := (p_date+p_time) at time zone 'America/Bogota';
  if start_at<=now() or p_date>(now() at time zone 'America/Bogota')::date+30
    or minute<court.open_minute or minute+p_duration>court.close_minute then
    raise exception 'invalid_slot' using errcode='22023';
  end if;
  select p.* into promo from public.promotions p
    where p.court_id=p_court and p.enabled and p_date between p.valid_from and p.valid_until
      and extract(dow from p_date)::integer=any(p.weekdays)
      and minute>=p.from_minute and minute+p_duration<=p.until_minute
      and (select count(*) from public.reservations r where r.promotion_id=p.id
        and (r.status in ('confirmed','completed') or (r.status='held' and r.expires_at>now()))) < p.max_uses
    order by p.percent desc,p.id limit 1;
  base_price := round(court.hourly_price::numeric*p_duration/60)::integer;
  discount := case when promo.id is null then 0 else round(base_price::numeric*promo.percent/100)::integer end;
  total := base_price-discount;
  deposit := round(total::numeric*30/100)::integer;
  balance := total-deposit;
  promotion_id := promo.id; promotion_title := promo.title;
  promotion_percent := promo.percent; discount_funder := promo.funded_by;
  return next;
end;
$$;
revoke all on function public.quote_slot(uuid,date,time,integer) from public;
grant execute on function public.quote_slot(uuid,date,time,integer) to anon,authenticated;

create or replace function public.create_reservation(
  p_court uuid, p_date date, p_time time, p_duration integer,
  p_players integer, p_team text, p_key uuid, p_kind text default 'player'
) returns public.reservations
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  court public.courts;
  result public.reservations;
  start_at timestamptz;
  end_at timestamptz;
  minute integer;
  pricing record;
begin
  if actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_key is null or p_date is null or p_time is null or p_duration is null or p_players is null
    or p_team is null or p_kind is null then raise exception 'invalid_input' using errcode='22023'; end if;
  if p_kind not in ('player','external','block') or p_duration not in (30,60,90,120)
    or length(btrim(p_team)) not between 1 and 40 or extract(second from p_time) <> 0
    or extract(minute from p_time)::integer % 30 <> 0 then
    raise exception 'invalid_input' using errcode='22023';
  end if;
  -- Serializa todos los bloqueos de un actor, incluso sobre canchas diferentes.
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  select * into court from public.courts where id=p_court for update;
  if not found then raise exception 'court_unavailable' using errcode='22023'; end if;
  if p_kind <> 'player' and not public.is_venue_member(court.venue_id) then
    raise exception 'owner_required' using errcode='42501';
  end if;
  if p_kind='player' and (not court.published or not exists(select 1 from public.venues v where v.id=court.venue_id and v.published)) then
    raise exception 'court_unavailable' using errcode='22023';
  end if;
  start_at := (p_date + p_time) at time zone 'America/Bogota';
  end_at := start_at + make_interval(mins => p_duration);
  minute := extract(hour from p_time)::integer*60 + extract(minute from p_time)::integer;
  select * into result from public.reservations where actor_id=actor and idempotency_key=p_key;
  if found then
    if result.court_id<>p_court or result.starts_at<>start_at or result.ends_at<>end_at or result.players<>p_players or result.team<>btrim(p_team) or result.kind<>p_kind then
      raise exception 'idempotency_mismatch' using errcode='22023';
    end if;
    return result;
  end if;
  if start_at <= clock_timestamp() or p_date > (clock_timestamp() at time zone 'America/Bogota')::date + 30
    or minute < court.open_minute or minute+p_duration > court.close_minute
    or p_players not between 1 and court.capacity then
    raise exception 'invalid_slot' using errcode='22023';
  end if;
  if p_kind='player' and (select count(*) from public.reservations where actor_id=actor and status='held' and expires_at>clock_timestamp()) >= 3 then
    raise exception 'hold_limit_reached' using errcode='P0001';
  end if;
  update public.reservations set status='expired'
    where court_id=p_court and status='held' and expires_at <= clock_timestamp();
  select * into pricing from public.quote_slot(p_court,p_date,p_time,p_duration);
  if p_kind='block' then
    pricing.base_price:=0; pricing.discount:=0; pricing.total:=0; pricing.deposit:=0; pricing.balance:=0;
    pricing.promotion_id:=null; pricing.promotion_title:=null; pricing.promotion_percent:=null; pricing.discount_funder:=null;
  end if;
  insert into public.reservations(court_id,actor_id,kind,status,starts_at,ends_at,expires_at,team,players,total,idempotency_key,base_price,discount,deposit,balance,promotion_id,promotion_title,promotion_percent,discount_funder)
    values(p_court,actor,p_kind,case when p_kind='player' then 'held' else 'confirmed' end,
      start_at,end_at,case when p_kind='player' then clock_timestamp()+interval '10 minutes' end,
      btrim(p_team),p_players,pricing.total,p_key,pricing.base_price,pricing.discount,pricing.deposit,pricing.balance,pricing.promotion_id,pricing.promotion_title,pricing.promotion_percent,pricing.discount_funder)
    returning * into result;
  return result;
end;
$$;


-- Solo mantenimiento administrativo; no se concede a jugadores ni propietarios.
create function public.expire_holds() returns integer
language plpgsql security definer set search_path = '' as $$
declare court record; affected integer; total integer := 0;
begin
  for court in select c.id from public.courts c
    where exists(select 1 from public.reservations r where r.court_id=c.id and r.status='held' and r.expires_at<=clock_timestamp())
    order by c.id limit 100 for update skip locked
  loop
    update public.reservations set status='expired' where court_id=court.id and status='held' and expires_at<=clock_timestamp();
    get diagnostics affected = row_count; total := total+affected;
  end loop;
  return total;
end;
$$;
revoke all on function public.expire_holds() from public,anon,authenticated;
grant execute on function public.expire_holds() to service_role;
commit;
