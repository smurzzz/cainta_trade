-- 014 · storage buckets and policies
-- Plan: docs/03_PHASE_PLAN.md → Phase 3.1 item 014; design: docs/06 "Storage buckets".
-- Server Actions upload with the service role (which bypasses storage RLS);
-- the client policies below exist so direct uploads work once third-party
-- auth is enabled (docs/05). residency-docs intentionally has NO policies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-photos',   'listing-photos',    true,  5242880, array['image/jpeg', 'image/png']),
  ('residency-docs',   'residency-docs',    false, 5242880, array['image/jpeg', 'image/png', 'application/pdf']),
  ('chat-photos',      'chat-photos',       false, 5242880, array['image/jpeg', 'image/png']),
  ('report-evidence',  'report-evidence',   false, 5242880, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

-- listing-photos: public read (public bucket), write only inside {userId}/.
create policy "listing photos public read" on storage.objects
  for select using (bucket_id = 'listing-photos');

create policy "listing photos insert own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (select auth.jwt()->>'sub') = (storage.foldername(name))[1]
  );

create policy "listing photos update own folder" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'listing-photos'
    and (select auth.jwt()->>'sub') = (storage.foldername(name))[1]
  );

create policy "listing photos delete own folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'listing-photos'
    and (select auth.jwt()->>'sub') = (storage.foldername(name))[1]
  );

-- residency-docs: private, server-only — no policies at all (docs/11 §5).

-- chat-photos: private; readable/writable only by the two offer parties.
create policy "chat photos party read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-photos'
    and exists (
      select 1 from offers o
      where o.id::text = (storage.foldername(name))[1]
        and (select auth.jwt()->>'sub') in (o.from_user_id, o.to_user_id)
    )
  );

create policy "chat photos party write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-photos'
    and exists (
      select 1 from offers o
      where o.id::text = (storage.foldername(name))[1]
        and (select auth.jwt()->>'sub') in (o.from_user_id, o.to_user_id)
    )
  );

-- report-evidence: private; reporter and staff only.
create policy "report evidence reporter or staff read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'report-evidence'
    and exists (
      select 1 from reports r
      where r.id::text = (storage.foldername(name))[1]
        and (r.reporter_id = (select auth.jwt()->>'sub')
             or (select role from profiles where id = (select auth.jwt()->>'sub'))
                in ('moderator', 'admin'))
    )
  );

create policy "report evidence reporter write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'report-evidence'
    and exists (
      select 1 from reports r
      where r.id::text = (storage.foldername(name))[1]
        and r.reporter_id = (select auth.jwt()->>'sub')
    )
  );
