create extension if not exists pg_cron;
select cron.schedule('alacancha-expire-holds', '* * * * *', 'select public.expire_holds();');
