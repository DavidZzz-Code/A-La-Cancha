create or replace function public.record_booking_receipt(p_id uuid,p_part text) returns void language plpgsql security definer set search_path='' as $$
declare booking public.reservations;
begin
 perform 1 from public.courts c where c.id=(select court_id from public.reservations where id=p_id) and public.is_venue_member(c.venue_id) for update;
 if not found then raise exception 'venue_unavailable' using errcode='42501'; end if;
 select * into strict booking from public.reservations where id=p_id for update;
 if p_part is null or p_part not in ('deposit','balance') or booking.kind<>'player' then raise exception 'invalid_receipt'; end if;
 if exists(select 1 from public.reservation_receipts where reservation_id=p_id and part=p_part) then return; end if;
 if p_part='deposit' and booking.status='held' then perform public.transition_reservation(p_id,'confirmed');
 elsif booking.status not in ('confirmed','completed') then raise exception 'invalid_status'; end if;
 if p_part='balance' and booking.pilot_deposit_approved_at is null and not exists(select 1 from public.reservation_receipts where reservation_id=p_id and part='deposit') then raise exception 'deposit_required'; end if;
 insert into public.reservation_receipts(reservation_id,part,amount,recorded_by) values(p_id,p_part,case p_part when 'deposit' then booking.deposit else booking.balance end,auth.uid());
end $$;
revoke all on function public.record_booking_receipt(uuid,text) from public,anon;
grant execute on function public.record_booking_receipt(uuid,text) to authenticated;

create or replace function public.prevent_pilot_receipt() returns trigger language plpgsql set search_path='' as $$
begin
 if new.part='deposit' and exists(select 1 from public.reservations where id=new.reservation_id and pilot_deposit_approved_at is not null) then raise exception 'simulated_deposit' using errcode='22023'; end if;
 return new;
end $$;

create function public.set_court_publication(p_court uuid,p_published boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.courts set published=p_published where id=p_court and public.is_venue_member(venue_id);
 if not found then raise exception 'venue_unavailable' using errcode='42501'; end if;
end $$;
revoke all on function public.set_court_publication(uuid,boolean) from public,anon;
grant execute on function public.set_court_publication(uuid,boolean) to authenticated;
create policy court_gallery_member_read on storage.objects for select to authenticated using(bucket_id='court-gallery' and exists(select 1 from public.courts c where c.id::text=split_part(storage.objects.name,'/',1) and public.is_venue_member(c.venue_id)));
