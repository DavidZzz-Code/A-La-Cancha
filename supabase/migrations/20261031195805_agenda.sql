-- Primera agenda de laboratorio. No incluye pagos ni se conecta automáticamente a la app.
begin;
create extension if not exists btree_gist;

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 100),
  city text not null default 'Cartagena',
  published boolean not null default false
);
create table public.venue_members (
  venue_id uuid not null references public.venues(id),
  user_id uuid not null references auth.users(id),
  primary key (venue_id,user_id)
);
create table public.courts (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id),
  name text not null,
  hourly_price integer not null check (hourly_price between 0 and 10000000),
  capacity integer not null check (capacity between 1 and 30),
  open_minute integer not null check (open_minute between 0 and 1380 and open_minute % 30 = 0),
  close_minute integer not null check (close_minute between 30 and 1440 and close_minute % 30 = 0),
  published boolean not null default false,
  check (open_minute < close_minute)
);
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts(id),
  actor_id uuid not null references auth.users(id),
  kind text not null check (kind in ('player','external','block')),
  status text not null check (status in ('held','confirmed','completed','cancelled','expired')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  expires_at timestamptz,
  team text not null check (length(btrim(team)) between 1 and 40),
  players integer not null check (players between 1 and 30),
  total integer not null check (total >= 0),
  currency text not null default 'COP' check (currency = 'COP'),
  idempotency_key uuid not null,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (status <> 'held' or expires_at is not null),
  unique (actor_id,idempotency_key),
  exclude using gist (court_id with =, tstzrange(starts_at,ends_at,'[)') with &&)
    where (status in ('held','confirmed','completed'))
);
create index reservations_actor on public.reservations(actor_id);
create index venue_members_user on public.venue_members(user_id);
create index courts_venue on public.courts(venue_id);
create table public.reservation_events (
  id bigint generated always as identity primary key,
  reservation_id uuid not null references public.reservations(id),
  actor_id uuid references auth.users(id),
  old_status text,
  new_status text not null,
  reason text,
  created_at timestamptz not null default now()
);
create index reservation_events_reservation on public.reservation_events(reservation_id);

create function public.is_venue_member(p_venue uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.venue_members where venue_id=p_venue and user_id=auth.uid());
$$;

alter table public.venues enable row level security;
alter table public.venue_members enable row level security;
alter table public.courts enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_events enable row level security;
create policy venues_read on public.venues for select to anon,authenticated
  using (published or public.is_venue_member(id));
create policy members_read on public.venue_members for select to authenticated using (user_id=auth.uid());
create policy courts_read on public.courts for select to anon,authenticated
  using (public.is_venue_member(venue_id) or (published and exists(select 1 from public.venues v where v.id=venue_id and v.published)));
create policy reservations_read on public.reservations for select to authenticated
  using (actor_id=auth.uid() or exists(select 1 from public.courts c where c.id=court_id and public.is_venue_member(c.venue_id)));
create policy events_read on public.reservation_events for select to authenticated
  using (exists(select 1 from public.reservations r where r.id=reservation_id));

create function public.audit_reservation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP='INSERT' then
    insert into public.reservation_events(reservation_id,actor_id,new_status) values(new.id,auth.uid(),new.status);
  elsif old.status is distinct from new.status then
    insert into public.reservation_events(reservation_id,actor_id,old_status,new_status,reason)
      values(new.id,auth.uid(),old.status,new.status,new.cancellation_reason);
  end if;
  return new;
end;
$$;
create trigger reservation_audit after insert or update on public.reservations
  for each row execute function public.audit_reservation();

-- Un único punto de entrada mantiene reservas externas, bloqueos y jugadores en la misma agenda.
create function public.create_reservation(
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
  price integer;
begin
  if actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_key is null or p_date is null or p_time is null or p_duration is null or p_players is null
    or p_team is null or p_kind is null then raise exception 'invalid_input' using errcode='22023'; end if;
  if p_kind not in ('player','external','block') or p_duration not in (30,60,90,120)
    or length(btrim(p_team)) not between 1 and 40 or extract(second from p_time) <> 0
    or extract(minute from p_time)::integer % 30 <> 0 then
    raise exception 'invalid_input' using errcode='22023';
  end if;
  -- Serializa reintentos del mismo actor/clave aunque se altere la cancha.
  perform pg_advisory_xact_lock(hashtextextended(actor::text || p_key::text,0));
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
  update public.reservations set status='expired'
    where court_id=p_court and status='held' and expires_at <= clock_timestamp();
  price := case when p_kind='block' then 0 else round(court.hourly_price::numeric*p_duration/60)::integer end;
  insert into public.reservations(court_id,actor_id,kind,status,starts_at,ends_at,expires_at,team,players,total,idempotency_key)
    values(p_court,actor,p_kind,case when p_kind='player' then 'held' else 'confirmed' end,
      start_at,end_at,case when p_kind='player' then clock_timestamp()+interval '10 minutes' end,
      btrim(p_team),p_players,price,p_key)
    returning * into result;
  return result;
end;
$$;

-- Confirmación manual de laboratorio: no marca pagos ni certifica cobros.
create function public.transition_reservation(p_id uuid,p_status text,p_reason text default null)
returns public.reservations language plpgsql security definer set search_path = '' as $$
declare result public.reservations; venue uuid; manager boolean;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  -- Mismo orden de bloqueo que create_reservation: cancha, después reserva.
  perform 1 from public.courts c where c.id=(select court_id from public.reservations where id=p_id) for update;
  select r.* into result from public.reservations r where r.id=p_id for update;
  if not found then raise exception 'reservation_unavailable' using errcode='42501'; end if;
  select venue_id into venue from public.courts where id=result.court_id;
  manager := public.is_venue_member(venue);
  if not manager and result.actor_id<>auth.uid() then raise exception 'reservation_unavailable' using errcode='42501'; end if;
  if p_status='cancelled' then
    if result.status not in ('held','confirmed') or result.starts_at<=clock_timestamp()
      or p_reason is null or length(btrim(p_reason)) not between 1 and 200 then
      raise exception 'invalid_transition' using errcode='22023';
    end if;
  elsif p_status='confirmed' then
    if not manager then raise exception 'owner_required' using errcode='42501'; end if;
    if result.status<>'held' or result.expires_at<=clock_timestamp() or result.starts_at<=clock_timestamp() then
      raise exception 'invalid_transition' using errcode='22023';
    end if;
  elsif p_status='completed' then
    if not manager then raise exception 'owner_required' using errcode='42501'; end if;
    if result.status<>'confirmed' or result.ends_at>clock_timestamp() then raise exception 'invalid_transition' using errcode='22023'; end if;
  else raise exception 'invalid_transition' using errcode='22023';
  end if;
  update public.reservations set status=p_status,cancellation_reason=case when p_status='cancelled' then btrim(p_reason) end
    where id=p_id returning * into result;
  return result;
end;
$$;

-- Disponibilidad pública sin nombres de equipos, actores ni identificadores de reservas.
create function public.occupied_slots(p_court uuid,p_date date)
returns table(starts_at timestamptz,ends_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.starts_at,r.ends_at from public.reservations r
    join public.courts c on c.id=r.court_id join public.venues v on v.id=c.venue_id
  where c.id=p_court and c.published and v.published
    and p_date between (now() at time zone 'America/Bogota')::date and (now() at time zone 'America/Bogota')::date+30
    and tstzrange(r.starts_at,r.ends_at,'[)') && tstzrange(p_date::timestamp at time zone 'America/Bogota',(p_date+1)::timestamp at time zone 'America/Bogota','[)')
    and (r.status in ('confirmed','completed') or (r.status='held' and r.expires_at>now()));
$$;

revoke all on public.venues,public.venue_members,public.courts,public.reservations,public.reservation_events from anon,authenticated;
grant select on public.venues,public.courts to anon,authenticated;
grant select on public.venue_members,public.reservations,public.reservation_events to authenticated;
revoke all on function public.is_venue_member(uuid), public.audit_reservation(),
  public.create_reservation(uuid,date,time,integer,integer,text,uuid,text),
  public.transition_reservation(uuid,text,text), public.occupied_slots(uuid,date) from public;
grant execute on function public.is_venue_member(uuid),public.occupied_slots(uuid,date) to anon,authenticated;
grant execute on function public.create_reservation(uuid,date,time,integer,integer,text,uuid,text),public.transition_reservation(uuid,text,text) to authenticated;
commit;
