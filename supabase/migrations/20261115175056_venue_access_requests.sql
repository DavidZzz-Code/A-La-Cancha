create table public.venue_access_requests (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  venue_name text not null check (length(btrim(venue_name)) between 2 and 100),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
alter table public.venue_access_requests enable row level security;
revoke all on public.venue_access_requests from public,anon,authenticated;
grant select on public.venue_access_requests to authenticated;
grant insert (venue_name) on public.venue_access_requests to authenticated;
grant all on public.venue_access_requests to service_role;
create policy read_own_request on public.venue_access_requests for select to authenticated using (user_id=auth.uid());
create policy submit_own_request on public.venue_access_requests for insert to authenticated with check (user_id=auth.uid() and status='pending');
