-- Détails du profil public : présentation, localisation, liens et photo.
alter table public.profiles
  add column bio text check (char_length(bio) <= 500),
  add column location text check (char_length(location) <= 80),
  add column website text check (char_length(website) <= 200 and website ~ '^https?://'),
  add column linkedin_url text check (char_length(linkedin_url) <= 200 and linkedin_url ~ '^https://([a-z0-9-]+\.)?linkedin\.com/'),
  add column github_url text check (char_length(github_url) <= 200 and github_url ~ '^https://(www\.)?github\.com/'),
  add column avatar_url text check (char_length(avatar_url) <= 500);

-- Photos de profil : dossier public en lecture, un seul fichier par utilisateur (avatars/<id>/avatar), 2 Mo, images uniquement.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Photos de profil lisibles par tous"
  on storage.objects for select
  using (bucket_id = 'avatars');
create policy "Ajouter sa propre photo"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Remplacer sa propre photo"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Supprimer sa propre photo"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
