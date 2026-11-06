-- D21: Storage needs read access to an object before it can delete it, so an old photo was left behind
-- after a new one replaced it. Students may list and read only their own avatar folder through the API
-- (anyone can still open a photo by its public address).
create policy "Students read their own avatar folder"
on storage.objects for select to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
