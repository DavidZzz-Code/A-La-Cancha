alter table public.venues add column pilot_deposit_enabled boolean not null default false;
alter table public.reservations add column pilot_deposit_approved_at timestamptz;
create function public.approve_pilot_deposit(p_id uuid) returns public.reservations
language plpgsql security definer set search_path='' as $$
declare booking public.reservations;
begin
 if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 perform 1 from public.courts c join public.venues v on v.id=c.venue_id
 where c.id=(select r.court_id from public.reservations r where r.id=p_id and r.actor_id=auth.uid() and r.kind='player')
 and c.published and v.published and v.pilot_deposit_enabled for update of c;
 if not found then raise exception 'pilot_unavailable' using errcode='42501'; end if;
 select * into strict booking from public.reservations where id=p_id and actor_id=auth.uid() for update;
 if booking.pilot_deposit_approved_at is not null then return booking; end if;
 if booking.status<>'held' or least(booking.expires_at,booking.starts_at)<=clock_timestamp() then raise exception 'hold_unavailable' using errcode='22023'; end if;
 update public.reservations set status='confirmed',pilot_deposit_approved_at=clock_timestamp() where id=p_id returning * into booking;
 return booking;
end $$;
revoke all on function public.approve_pilot_deposit(uuid) from public,anon;
grant execute on function public.approve_pilot_deposit(uuid) to authenticated;
