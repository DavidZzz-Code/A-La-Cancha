-- Exclusivamente en una base desechable llamada alacancha_test.
do $$ begin
  if current_database()<>'alacancha_test' then raise exception 'test_database_required'; end if;
end $$;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
grant usage on schema auth,public to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;

-- Reproduce concesiones directas predeterminadas del proyecto Supabase.
alter default privileges in schema public grant execute on functions to anon, authenticated;
