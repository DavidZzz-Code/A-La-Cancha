create function public.prevent_pilot_receipt() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from public.reservations where id=new.reservation_id and pilot_deposit_approved_at is not null) then raise exception 'simulated_reservation' using errcode='22023'; end if;
 return new;
end $$;
create trigger prevent_pilot_receipt before insert on public.reservation_receipts for each row execute function public.prevent_pilot_receipt();
