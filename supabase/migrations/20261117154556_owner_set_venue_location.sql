create or replace function public.set_venue_location(p_venue uuid, p_lat double precision, p_lon double precision)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_lat is null or p_lon is null or not (p_lat between -90 and 90 and p_lon between -180 and 180) then
    raise exception 'Coordenadas inválidas';
  end if;
  update public.venues v set latitude=p_lat, longitude=p_lon
  where v.id=p_venue and exists(select 1 from public.venue_members m where m.venue_id=v.id and m.user_id=(select auth.uid()));
  if not found then raise exception 'Se requiere acceso a la sede' using errcode='42501'; end if;
end;
$$;
revoke all on function public.set_venue_location(uuid,double precision,double precision) from public,anon;
grant execute on function public.set_venue_location(uuid,double precision,double precision) to authenticated;
