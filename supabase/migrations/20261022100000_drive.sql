-- Drive (docs/drive.md, D24) : dossiers à un seul niveau, fichiers privés ou publics, stockage PRIVÉ.
-- Les fichiers ne sont lus que par des adresses signées de courte durée, créées côté serveur
-- (même principe que le Kanban) : un fichier repassé en privé devient aussitôt inaccessible.

create table public.drive_folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100 and position('/' in name) = 0),
  created_at timestamptz not null default now(),
  -- Un seul niveau de dossiers : le nom est unique par propriétaire.
  unique (owner_id, name)
);

create table public.drive_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  -- null = à la racine. Supprimer un dossier supprime ses lignes de fichiers : l'application
  -- doit d'abord retirer les objets du stockage (Supabase interdit de les effacer en SQL).
  folder_id uuid references public.drive_folders (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100 and position('/' in name) = 0),
  -- Chemin dans le dossier « files » : <propriétaire>/<id du fichier>.
  storage_path text not null unique check (char_length(storage_path) <= 200),
  mime_type text not null default 'application/octet-stream' check (char_length(mime_type) <= 150),
  size_bytes bigint not null check (size_bytes >= 0 and size_bytes <= 10485760), -- 10 Mo
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Programmes et scripts refusés (un fichier public ne doit pas en diffuser).
  check (lower(name) !~ '\.(exe|msi|bat|cmd|com|scr|sh|js|vbs|jar|apk|dmg)$')
);

-- Un nom ne peut exister qu'une fois par dossier (l'application renomme les doublons « nom (2).ext »).
create unique index drive_files_unique_name_idx
  on public.drive_files (owner_id, coalesce(folder_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
create index drive_files_folder_idx on public.drive_files (owner_id, folder_id);
create index drive_files_public_idx on public.drive_files (owner_id, updated_at desc) where is_public;

-- Limite de 100 éléments par dossier. À la racine, les dossiers comptent aussi. Verrou sur le profil
-- du propriétaire pour que deux envois simultanés ne dépassent pas la limite.
create function public.drive_check_folder_limit()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  n integer;
begin
  perform 1 from public.profiles p where p.id = new.owner_id for update;
  if tg_table_name = 'drive_folders' then
    select (select count(*) from public.drive_files f where f.owner_id = new.owner_id and f.folder_id is null)
         + (select count(*) from public.drive_folders d where d.owner_id = new.owner_id) into n;
  elsif new.folder_id is null then
    select (select count(*) from public.drive_files f where f.owner_id = new.owner_id and f.folder_id is null)
         + (select count(*) from public.drive_folders d where d.owner_id = new.owner_id) into n;
  else
    select count(*) into n from public.drive_files f where f.folder_id = new.folder_id;
  end if;
  if n >= 100 then
    raise exception '100 éléments au maximum par dossier' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger drive_folders_limit before insert on public.drive_folders
  for each row execute function public.drive_check_folder_limit();
create trigger drive_files_limit_insert before insert on public.drive_files
  for each row execute function public.drive_check_folder_limit();
-- Déplacer un fichier vers un autre dossier compte aussi.
create trigger drive_files_limit_move before update of folder_id on public.drive_files
  for each row when (old.folder_id is distinct from new.folder_id)
  execute function public.drive_check_folder_limit();

-- Date de modification : renommage, déplacement, changement de visibilité.
create function public.drive_touch_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger drive_files_touch before update on public.drive_files
  for each row execute function public.drive_touch_updated_at();

revoke execute on function public.drive_check_folder_limit() from public, anon, authenticated;
revoke execute on function public.drive_touch_updated_at() from public, anon, authenticated;

-- Dossiers : privés, visibles seulement par leur propriétaire.
alter table public.drive_folders enable row level security;
create policy "Voir ses dossiers" on public.drive_folders
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Créer ses dossiers" on public.drive_folders
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Renommer ses dossiers" on public.drive_folders
  for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Supprimer ses dossiers" on public.drive_folders
  for delete to authenticated using ((select auth.uid()) = owner_id);

-- Fichiers : le propriétaire voit tout ; un visiteur ne voit que les fichiers publics d'un profil en ligne.
alter table public.drive_files enable row level security;
create policy "Voir ses fichiers, ou les fichiers publics d'un profil en ligne" on public.drive_files
  for select using (
    (select auth.uid()) = owner_id
    or (is_public and exists (
      select 1 from public.profiles p where p.id = owner_id and p.is_online))
  );
create policy "Ajouter ses fichiers" on public.drive_files
  for insert to authenticated with check (
    (select auth.uid()) = owner_id
    and (storage.foldername(storage_path))[1] = (select auth.uid())::text
    and (folder_id is null or exists (
      select 1 from public.drive_folders d where d.id = folder_id and d.owner_id = (select auth.uid())))
  );
create policy "Modifier ses fichiers" on public.drive_files
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and (folder_id is null or exists (
      select 1 from public.drive_folders d where d.id = folder_id and d.owner_id = (select auth.uid())))
  );
create policy "Supprimer ses fichiers" on public.drive_files
  for delete to authenticated using ((select auth.uid()) = owner_id);

-- Sur ce projet, chaque table demande des droits explicites (voir 20261020162600).
-- Mise à jour limitée aux colonnes utiles : ni le propriétaire ni le chemin ne changent.
grant select on public.drive_files to anon, authenticated;
grant insert on public.drive_files to authenticated;
grant update (name, folder_id, is_public) on public.drive_files to authenticated;
grant delete on public.drive_files to authenticated;
grant select, insert, delete on public.drive_folders to authenticated;
grant update (name) on public.drive_folders to authenticated;

-- Dossier privé : aucune adresse publique. 10 Mo par fichier, tous types (les extensions de
-- programmes sont refusées par l'application et par la contrainte de drive_files).
insert into storage.buckets (id, name, public, file_size_limit)
values ('files', 'files', false, 10485760)
on conflict (id) do nothing;

-- Lire (et donc signer une adresse) : le propriétaire dans son dossier, ou n'importe qui pour un
-- fichier enregistré qu'il a le droit de voir (la RLS de drive_files s'applique : public + profil en ligne).
create policy "Voir les fichiers Drive accessibles" on storage.objects
  for select using (
    bucket_id = 'files' and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (select 1 from public.drive_files f where f.storage_path = name)
    )
  );
create policy "Déposer ses fichiers Drive" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Supprimer ses fichiers Drive" on storage.objects
  for delete to authenticated
  using (bucket_id = 'files' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Jauge de stockage : octets utilisés par poste dans TOUT le stockage du projet (MyWork n'est pas
-- encore un SaaS, il n'y a pas de quota par utilisateur). Les dossiers étant privés, il faut lire
-- storage.objects avec les droits de la fonction.
create function public.storage_usage()
returns table (bucket_id text, bytes bigint)
language sql security definer stable set search_path = '' as $$
  select o.bucket_id, coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint
  from storage.objects o
  group by o.bucket_id
$$;

revoke execute on function public.storage_usage() from public, anon;
grant execute on function public.storage_usage() to authenticated;
