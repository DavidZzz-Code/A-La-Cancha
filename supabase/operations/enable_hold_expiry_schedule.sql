-- Solo Supabase de desarrollo con pg_cron disponible; no ejecutar en el laboratorio PostgreSQL vanilla.
-- Aplicado por MCP como 20261031201446_enable_hold_expiry_schedule.
create extension if not exists pg_cron;
select cron.schedule('alacancha-expire-holds', '* * * * *', 'select public.expire_holds();');
