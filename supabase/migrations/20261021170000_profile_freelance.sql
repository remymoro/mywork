-- Module Profil : offre freelance (case « Je propose mes services en freelance ») et prestations.
alter table public.profiles
  add column freelance_enabled boolean not null default false,
  add column freelance_available_from date,
  add column freelance_days_per_week smallint check (freelance_days_per_week between 1 and 5),
  add column freelance_work_modes text[] not null default '{}'
    check (freelance_work_modes <@ array['sur_site', 'hybride', 'teletravail']),
  add column freelance_daily_rate integer check (freelance_daily_rate between 1 and 10000),
  add column freelance_travel_zone text check (char_length(freelance_travel_zone) <= 120);

create table public.profile_services (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  position integer not null default 0,
  is_visible boolean not null default true,
  title text not null check (char_length(title) between 1 and 100),
  description text check (char_length(description) <= 1000),
  starting_price integer check (starting_price between 1 and 1000000),
  created_at timestamptz not null default now()
);

create index profile_services_profile_id_idx on public.profile_services (profile_id, position);
alter table public.profile_services enable row level security;

-- Mêmes règles que les autres sections (20261021140000).
create policy "Éléments visibles d'un profil en ligne, ou les siens" on public.profile_services
  for select using (
    (select auth.uid()) = profile_id
    or (is_visible and exists (
      select 1 from public.profiles p where p.id = profile_id and p.is_online))
  );
create policy "Ajouter ses propres éléments" on public.profile_services
  for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "Modifier ses propres éléments" on public.profile_services
  for update to authenticated
  using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
create policy "Supprimer ses propres éléments" on public.profile_services
  for delete to authenticated using ((select auth.uid()) = profile_id);

grant select on public.profile_services to anon, authenticated;
grant insert, update, delete on public.profile_services to authenticated;
