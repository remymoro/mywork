-- Module Profil, version 1 (docs/modules.md) : en-tête, à propos, compétences, puis une table par section à plusieurs éléments.

alter table public.profiles
  add column avatar_url text,
  add column location text check (char_length(location) <= 100),
  add column open_to_work boolean not null default false,
  add column open_to_work_details text check (char_length(open_to_work_details) <= 120),
  add column contact_email text check (char_length(contact_email) <= 254),
  add column website_url text check (char_length(website_url) <= 300),
  add column linkedin_url text check (char_length(linkedin_url) <= 300),
  add column github_url text check (char_length(github_url) <= 300),
  add column other_url text check (char_length(other_url) <= 300),
  add column about text check (char_length(about) <= 2600),
  add column top_skills text[] not null default '{}' check (cardinality(top_skills) <= 5),
  add column skills text[] not null default '{}' check (cardinality(skills) <= 50);

-- Colonnes communes aux sections : propriétaire, ordre d'affichage, visibilité publique.
create table public.profile_experiences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  position integer not null default 0,
  is_visible boolean not null default true,
  title text not null check (char_length(title) between 1 and 100),
  company text not null check (char_length(company) between 1 and 100),
  employment_type text check (employment_type in
    ('cdi', 'cdd', 'freelance', 'stage', 'alternance', 'interim', 'benevole', 'autre')),
  location text check (char_length(location) <= 100),
  work_mode text check (work_mode in ('sur_site', 'hybride', 'teletravail')),
  start_date date not null,
  end_date date,
  is_current boolean not null default false,
  description text check (char_length(description) <= 2000),
  skills text[] not null default '{}' check (cardinality(skills) <= 20),
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create table public.profile_educations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  position integer not null default 0,
  is_visible boolean not null default true,
  school text not null check (char_length(school) between 1 and 120),
  degree text check (char_length(degree) <= 120),
  field text check (char_length(field) <= 120),
  start_year integer check (start_year between 1950 and 2100),
  end_year integer check (end_year between 1950 and 2100),
  grade text check (char_length(grade) <= 60),
  description text check (char_length(description) <= 2000),
  created_at timestamptz not null default now(),
  check (end_year is null or start_year is null or end_year >= start_year)
);

create table public.profile_languages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  position integer not null default 0,
  is_visible boolean not null default true,
  name text not null check (char_length(name) between 1 and 60),
  level text not null check (level in
    ('notions', 'intermediaire', 'professionnel', 'courant', 'bilingue', 'maternelle')),
  created_at timestamptz not null default now()
);

create table public.profile_certifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  position integer not null default 0,
  is_visible boolean not null default true,
  name text not null check (char_length(name) between 1 and 120),
  issuer text check (char_length(issuer) <= 120),
  issued_on date,
  expires_on date,
  credential_url text check (char_length(credential_url) <= 300),
  created_at timestamptz not null default now(),
  check (expires_on is null or issued_on is null or expires_on >= issued_on)
);

create table public.profile_projects (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  position integer not null default 0,
  is_visible boolean not null default true,
  name text not null check (char_length(name) between 1 and 120),
  start_date date,
  end_date date,
  description text check (char_length(description) <= 2000),
  url text check (char_length(url) <= 300),
  skills text[] not null default '{}' check (cardinality(skills) <= 20),
  created_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

-- Sécurité (RLS) : le propriétaire voit et modifie tout ; les visiteurs ne voient que les éléments visibles d'un profil en ligne.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profile_experiences', 'profile_educations', 'profile_languages',
    'profile_certifications', 'profile_projects'
  ] loop
    execute format('create index %1$s_profile_id_idx on public.%1$I (profile_id, position)', t);
    execute format('alter table public.%I enable row level security', t);
    execute format($p$
      create policy "Éléments visibles d'un profil en ligne, ou les siens" on public.%I
        for select using (
          (select auth.uid()) = profile_id
          or (is_visible and exists (
            select 1 from public.profiles p where p.id = profile_id and p.is_online))
        )$p$, t);
    execute format($p$
      create policy "Ajouter ses propres éléments" on public.%I
        for insert to authenticated with check ((select auth.uid()) = profile_id)$p$, t);
    execute format($p$
      create policy "Modifier ses propres éléments" on public.%I
        for update to authenticated
        using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id)$p$, t);
    execute format($p$
      create policy "Supprimer ses propres éléments" on public.%I
        for delete to authenticated using ((select auth.uid()) = profile_id)$p$, t);
    -- Sur ce projet, chaque table demande des droits explicites (voir 20261020162600).
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
  end loop;
end;
$$;

-- Photos de profil : dossier public, un sous-dossier par utilisateur (<id>/...), 2 Mo maximum.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Voir ses propres photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Déposer sa propre photo" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Remplacer sa propre photo" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Supprimer sa propre photo" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
