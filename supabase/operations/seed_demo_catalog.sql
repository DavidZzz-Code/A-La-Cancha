-- Solo proyecto a-la-cancha-dev (pednpnrgxszcffivfozo). No es una migración ni se ejecuta automáticamente.
-- Sede y cancha ficticias para validar catálogo/ocupación/cotización. Sin usuarios ni reservas.
do $$
declare venue uuid;
begin
  select id into venue from public.venues where name='DEMO A La Cancha — sede ficticia';
  if venue is null then
    insert into public.venues(name,city,published) values('DEMO A La Cancha — sede ficticia','Cartagena',true) returning id into venue;
  end if;
  if not exists(select 1 from public.courts where venue_id=venue and name='DEMO — cancha ficticia, sin reservas reales') then
    insert into public.courts(venue_id,name,hourly_price,capacity,open_minute,close_minute,published)
    values(venue,'DEMO — cancha ficticia, sin reservas reales',100000,10,420,1380,true);
  end if;
end $$;
