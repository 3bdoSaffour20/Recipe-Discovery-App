-- ==========================================================================
-- Recipe Discovery — avatar storage
--
-- Run this once in the Supabase SQL editor (or `supabase db push`) before
-- using "Edit profile". It is idempotent: the bucket is upserted and every
-- policy is dropped before being recreated.
-- ==========================================================================

-- Public bucket: avatars are displayed through their public URL, so readers
-- do not need a signed link. Uploads still require a session and an object
-- name that starts with the caller's own user id (`<userId>-<timestamp>.ext`).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB, matching the client-side limit in authService.js
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- No SELECT policy is added: the bucket is public, so images load through
-- their public URL, while omitting the policy keeps the bucket from being
-- listable by anon.

-- A signed-in user may only create objects in the bucket whose name begins
-- with their own id. The client never chooses another user's prefix.
drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and name like (select auth.uid())::text || '-%'
  );

-- Replacement uses a new timestamped name rather than an overwrite, so no
-- UPDATE policy is needed. Add one only if the upload switches to upsert.
