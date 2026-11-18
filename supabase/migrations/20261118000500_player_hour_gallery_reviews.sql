create or replace function public.enforce_player_hour() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.kind='player' and new.ends_at-new.starts_at <> interval '1 hour' then raise exception 'player_reservations_require_one_hour' using errcode='22023'; end if;
 return new;
end $$;
create trigger enforce_player_hour before insert on public.reservations for each row execute function public.enforce_player_hour();

create table public.court_reviews (
 reservation_id uuid primary key references public.reservations(id) on delete cascade,
 court_id uuid not null references public.courts(id) on delete cascade,
 rating smallint not null check(rating between 1 and 5),
 comment text not null default '' check(length(comment)<=500),
 created_at timestamptz not null default now()
);
alter table public.court_reviews enable row level security;
revoke all on public.court_reviews from public, anon, authenticated;
grant select(court_id,rating,comment,created_at) on public.court_reviews to anon, authenticated;
grant insert(reservation_id,court_id,rating,comment) on public.court_reviews to authenticated;
create policy read_reviews on public.court_reviews for select using(exists(select 1 from public.courts c join public.venues v on v.id=c.venue_id where c.id=court_reviews.court_id and c.published and v.published));
create policy write_review on public.court_reviews for insert to authenticated with check(exists(select 1 from public.reservations r where r.id=court_reviews.reservation_id and r.actor_id=(select auth.uid()) and r.kind='player' and r.status='completed' and r.ends_at<=now() and r.court_id=court_reviews.court_id));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('court-gallery','court-gallery',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy court_gallery_read on storage.objects for select using(bucket_id='court-gallery' and exists(select 1 from public.courts c join public.venues v on v.id=c.venue_id where c.id::text=split_part(storage.objects.name,'/',1) and c.published and v.published));
create policy court_gallery_upload on storage.objects for insert to authenticated with check(bucket_id='court-gallery' and exists(select 1 from public.courts c join public.venue_members m on m.venue_id=c.venue_id where c.id::text=split_part(storage.objects.name,'/',1) and m.user_id=(select auth.uid())));
create policy court_gallery_remove on storage.objects for delete to authenticated using(bucket_id='court-gallery' and exists(select 1 from public.courts c join public.venue_members m on m.venue_id=c.venue_id where c.id::text=split_part(storage.objects.name,'/',1) and m.user_id=(select auth.uid())));
