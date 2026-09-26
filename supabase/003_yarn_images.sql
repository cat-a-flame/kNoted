-- ─────────────────────────────────────────────────────────────
-- kNoted migration 003 — yarn images
--
-- Run once in the Supabase SQL editor (after schema.sql).
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────

-- 1. Where the image lives in storage, e.g. "<user id>/<yarn id>-1719.jpg"
alter table public.yarns add column if not exists image_path text;

-- 2. Public bucket for yarn images (5 MB, images only).
--    Public = anyone with the exact (unguessable) URL can view an image;
--    only the owner can upload, replace or delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('yarn-images', 'yarn-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3. Each user may only write inside their own folder: "<auth.uid()>/..."
drop policy if exists "Yarn images: owner can upload" on storage.objects;
drop policy if exists "Yarn images: owner can update" on storage.objects;
drop policy if exists "Yarn images: owner can delete" on storage.objects;

create policy "Yarn images: owner can upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'yarn-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Yarn images: owner can update" on storage.objects
  for update to authenticated
  using (bucket_id = 'yarn-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Yarn images: owner can delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'yarn-images' and (storage.foldername(name))[1] = auth.uid()::text);
