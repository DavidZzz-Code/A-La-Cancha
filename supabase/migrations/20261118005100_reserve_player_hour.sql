create function public.reserve_player_hour(p_court uuid,p_date date,p_time time,p_players integer,p_team text,p_key uuid) returns public.reservations language plpgsql security definer set search_path='' as $$
declare booking public.reservations;
begin
 booking:=public.create_reservation(p_court,p_date,p_time,60,p_players,p_team,p_key,'player');
 if booking.status='held' and exists(select 1 from public.courts c join public.venues v on v.id=c.venue_id where c.id=p_court and v.pilot_deposit_enabled) then
  booking:=public.approve_pilot_deposit(booking.id);
 end if;
 return booking;
end $$;
revoke all on function public.reserve_player_hour(uuid,date,time,integer,text,uuid) from public,anon;
grant execute on function public.reserve_player_hour(uuid,date,time,integer,text,uuid) to authenticated;
