-- 023 · profiles.created_at + avatars bucket
-- Plan: docs/03_PHASE_PLAN.md → Phase 3.11 (signups-vs-trades by month needs a
-- signup timestamp; the Clerk webhook inserts the row at user.created) and
-- 3.12 uploadPhoto (avatar storage).

alter table profiles
  add column if not exists created_at timestamptz not null default now();

create index if not exists profiles_created_at_idx on profiles (created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Avatars are uploaded server-side (service role); read is public like
-- listing-photos (docs/11 §5 — no signed URLs needed for public images).
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');
