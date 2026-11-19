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

-- Subconjunto de Supabase Storage que requieren las migraciones de galería.
create schema storage;
create table storage.buckets(
  id text primary key,
  name text not null unique,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects(
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null,
  unique(bucket_id,name)
);
alter table storage.objects enable row level security;
grant usage on schema storage to anon,authenticated;
grant select on storage.objects to anon,authenticated;
grant insert,delete on storage.objects to authenticated;
