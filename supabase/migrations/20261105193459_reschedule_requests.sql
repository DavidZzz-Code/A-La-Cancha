create table public.reschedule_requests (
  id uuid primary key,
  reservation_id uuid not null references public.reservations(id),
  original_start timestamptz not null,
  proposed_start timestamptz not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','unavailable')),
  created_at timestamptz not null default now(),
  decided_by uuid references auth.users(id),
  decided_at timestamptz
);
create unique index reschedule_one_pending on public.reschedule_requests(reservation_id) where status='pending';
create index reschedule_history on public.reschedule_requests(reservation_id,created_at desc);
alter table public.reschedule_requests enable row level security;
revoke all on public.reschedule_requests from public, anon, authenticated;
grant select (id,reservation_id,original_start,proposed_start,status,created_at,decided_at) on public.reschedule_requests to authenticated;
create policy read_related_changes on public.reschedule_requests for select to authenticated using (
  exists (select 1 from public.reservations r where r.id=reservation_id)
);

-- Same court lock order as create_reservation and transition_reservation.
create function public.request_reschedule(p_id uuid,p_start timestamptz,p_key uuid)
returns public.reschedule_requests language plpgsql security definer set search_path='' as $$
declare r public.reservations; request public.reschedule_requests; local_start timestamp; duration integer; price integer;
begin
  perform 1 from public.courts where id=(select court_id from public.reservations where id=p_id and actor_id=auth.uid()) for update;
  select * into r from public.reservations where id=p_id and actor_id=auth.uid() and kind='player' for update;
  if not found then raise exception 'reservation_unavailable' using errcode='42501'; end if;
  select * into request from public.reschedule_requests where id=p_key;
  if found then
    if request.reservation_id=p_id and request.proposed_start=p_start then return request; end if;
    raise exception 'invalid_key';
  end if;
  if r.status<>'confirmed' or r.starts_at<=clock_timestamp() or p_start is null or p_start=r.starts_at then raise exception 'invalid_slot'; end if;
  local_start := p_start at time zone 'America/Bogota';
  duration := extract(epoch from r.ends_at-r.starts_at)::integer/60;
  select total into price from public.quote_slot(r.court_id,local_start::date,local_start::time,duration);
  if price is distinct from r.total then raise exception 'price_changed'; end if;
  if exists(select 1 from public.reservations other where other.court_id=r.court_id and other.id<>r.id and other.status in ('confirmed','held')
    and other.starts_at<p_start+make_interval(mins=>duration) and other.ends_at>p_start) then raise exception 'slot_unavailable'; end if;
  insert into public.reschedule_requests(id,reservation_id,original_start,proposed_start)
    values(p_key,p_id,r.starts_at,p_start) returning * into request;
  return request;
end;
$$;

create function public.decide_reschedule(p_key uuid,p_accept boolean)
returns public.reschedule_requests language plpgsql security definer set search_path='' as $$
declare r public.reservations; request public.reschedule_requests; court public.courts; duration integer; local_start timestamp; price integer; outcome text;
begin
  select c.* into court from public.courts c join public.reservations b on b.court_id=c.id
    join public.reschedule_requests q on q.reservation_id=b.id where q.id=p_key and public.is_venue_member(c.venue_id) for update of c;
  if not found or auth.uid() is null then raise exception 'owner_required' using errcode='42501'; end if;
  select b.* into r from public.reservations b join public.reschedule_requests q on q.reservation_id=b.id where q.id=p_key for update of b;
  select * into request from public.reschedule_requests where id=p_key for update;
  if request.status<>'pending' then return request; end if;
  if p_accept is null then raise exception 'invalid_decision'; end if;
  outcome := 'rejected';
  if p_accept then
    outcome := 'unavailable';
    if r.status='confirmed' and r.starts_at=request.original_start and least(r.starts_at,request.proposed_start)>clock_timestamp() then
      duration := extract(epoch from r.ends_at-r.starts_at)::integer/60;
      local_start := request.proposed_start at time zone 'America/Bogota';
      begin
        select total into price from public.quote_slot(r.court_id,local_start::date,local_start::time,duration);
        if price=r.total then
          update public.reservations set starts_at=request.proposed_start,ends_at=request.proposed_start+make_interval(mins=>duration) where id=r.id;
          outcome := 'approved';
        end if;
      exception when exclusion_violation or invalid_parameter_value then outcome := 'unavailable';
      end;
    end if;
  end if;
  update public.reschedule_requests set status=outcome,decided_by=auth.uid(),decided_at=clock_timestamp() where id=p_key returning * into request;
  return request;
end;
$$;
revoke all on function public.request_reschedule(uuid,timestamptz,uuid),public.decide_reschedule(uuid,boolean) from public,anon,authenticated;
grant execute on function public.request_reschedule(uuid,timestamptz,uuid),public.decide_reschedule(uuid,boolean) to authenticated;
