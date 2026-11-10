-- 0012_storage.sql
-- Buckets: avatars, team-logos, tournament-banners (public read), invoices (private).
-- Upload path rule: <auth.uid()>/<filename>

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars',            'avatars',            true,  5242880, array['image/jpeg','image/png','image/webp']),
  ('team-logos',         'team-logos',         true,  2097152, array['image/jpeg','image/png','image/webp']),
  ('tournament-banners', 'tournament-banners', true,  5242880, array['image/jpeg','image/png','image/webp']),
  ('invoices',           'invoices',           false, 2097152, array['application/pdf','text/html'])
on conflict (id) do nothing;

create policy "public read images" on storage.objects for select
  using (bucket_id in ('avatars','team-logos','tournament-banners'));

create policy "users upload own images" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars','team-logos','tournament-banners') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users update own images" on storage.objects for update to authenticated
  using (bucket_id in ('avatars','team-logos','tournament-banners') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users delete own images" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars','team-logos','tournament-banners') and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "owner reads own invoices" on storage.objects for select to authenticated
  using (bucket_id = 'invoices' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));
-- invoices are written only by the service role (Edge Function)
