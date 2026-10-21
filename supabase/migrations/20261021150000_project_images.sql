-- Image d'un projet (module Profil) : affichée sur la page publique.
alter table public.profile_projects add column image_url text;

-- Dossier public « project-images » : <id utilisateur>/<id projet>/..., 2 Mo maximum.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-images', 'project-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Voir ses propres images de projet" on storage.objects
  for select to authenticated
  using (bucket_id = 'project-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Déposer ses propres images de projet" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Remplacer ses propres images de projet" on storage.objects
  for update to authenticated
  using (bucket_id = 'project-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Supprimer ses propres images de projet" on storage.objects
  for delete to authenticated
  using (bucket_id = 'project-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
