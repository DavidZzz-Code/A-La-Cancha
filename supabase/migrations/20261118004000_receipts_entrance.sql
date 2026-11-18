alter table public.venues add column entrance_confirmed boolean not null default false, add column address text;
create or replace function public.set_venue_location(p_venue uuid,p_lat double precision,p_lon double precision) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_lat is null or p_lon is null or not(p_lat between -90 and 90 and p_lon between -180 and 180) then raise exception 'invalid_coordinates'; end if;
 update public.venues set latitude=p_lat,longitude=p_lon,entrance_confirmed=true where id=p_venue and public.is_venue_member(id);
 if not found then raise exception 'venue_unavailable' using errcode='42501'; end if;
end $$;
create table public.reservation_receipts(
 reservation_id uuid not null references public.reservations(id), part text not null check(part in ('deposit','balance')),
 amount integer not null check(amount>=0), recorded_by uuid not null, recorded_at timestamptz not null default now(), primary key(reservation_id,part)
);
alter table public.reservation_receipts enable row level security;
revoke all on public.reservation_receipts from public,anon,authenticated;
grant select(reservation_id,part,amount) on public.reservation_receipts to authenticated;
create policy read_booking_receipts on public.reservation_receipts for select to authenticated using(exists(select 1 from public.reservations r join public.courts c on c.id=r.court_id where r.id=reservation_id and (r.actor_id=auth.uid() or public.is_venue_member(c.venue_id))));
create function public.record_booking_receipt(p_id uuid,p_part text) returns void language plpgsql security definer set search_path='' as $$
declare booking public.reservations;
begin
 perform 1 from public.courts c where c.id=(select court_id from public.reservations where id=p_id) and public.is_venue_member(c.venue_id) for update;
 if not found then raise exception 'venue_unavailable' using errcode='42501'; end if;
 select * into strict booking from public.reservations where id=p_id for update;
 if p_part is null or p_part not in ('deposit','balance') or booking.kind<>'player' then raise exception 'invalid_receipt'; end if;
 if exists(select 1 from public.reservation_receipts where reservation_id=p_id and part=p_part) then return; end if;
 if p_part='deposit' and booking.status='held' then perform public.transition_reservation(p_id,'confirmed');
 elsif booking.status not in ('confirmed','completed') then raise exception 'invalid_status'; end if;
 if p_part='balance' and not exists(select 1 from public.reservation_receipts where reservation_id=p_id and part='deposit') then raise exception 'deposit_required'; end if;
 insert into public.reservation_receipts(reservation_id,part,amount,recorded_by) values(p_id,p_part,case p_part when 'deposit' then booking.deposit else booking.balance end,auth.uid());
end $$;
revoke all on function public.record_booking_receipt(uuid,text) from public,anon;
grant execute on function public.record_booking_receipt(uuid,text) to authenticated;
