create or replace function public.update_court_settings(p_court uuid,p_price integer,p_open integer,p_close integer,p_capacity integer)
returns void language plpgsql security definer set search_path='' as $$
declare target public.courts%rowtype;
begin
select * into target from public.courts where id=p_court for update;
if not found or not exists(select 1 from public.venue_members where venue_id=target.venue_id and user_id=(select auth.uid())) then raise exception 'Acceso denegado' using errcode='42501'; end if;
if p_price is null or p_open is null or p_close is null or p_capacity is null or p_price not between 0 and 10000000 or p_open<0 or p_close>1440 or p_open>=p_close or p_open%30<>0 or p_close%30<>0 or p_capacity not between 1 and 12 then raise exception 'Datos inválidos' using errcode='22023'; end if;
update public.courts set hourly_price=p_price,open_minute=p_open,close_minute=p_close,capacity=p_capacity where id=p_court;
end $$;
revoke all on function public.update_court_settings(uuid,integer,integer,integer,integer) from public,anon;
grant execute on function public.update_court_settings(uuid,integer,integer,integer,integer) to authenticated;
