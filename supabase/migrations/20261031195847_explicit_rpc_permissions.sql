begin;
revoke all on function public.audit_reservation() from public, anon, authenticated;
revoke all on function public.create_reservation(uuid,date,time,integer,integer,text,uuid,text), public.transition_reservation(uuid,text,text) from public, anon, authenticated;
grant execute on function public.create_reservation(uuid,date,time,integer,integer,text,uuid,text), public.transition_reservation(uuid,text,text) to authenticated;
commit;
