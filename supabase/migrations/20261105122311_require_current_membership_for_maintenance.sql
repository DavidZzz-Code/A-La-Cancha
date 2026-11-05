create or replace function public.transition_reservation(p_id uuid,p_status text,p_reason text default null)
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
  if not manager and (result.kind='block' or result.actor_id<>auth.uid()) then raise exception 'reservation_unavailable' using errcode='42501'; end if;
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
