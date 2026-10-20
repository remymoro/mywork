-- Profils publics : un profil par utilisateur, adressé par son pseudo (mywork.website/<pseudo>).
-- Le pseudo est modifiable ; les anciens pseudos redirigent vers le nouveau (username_history).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    check (username ~ '^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$'),
  display_name text,
  headline text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pseudos que personne ne peut prendre (pages du site).
create table public.reserved_usernames (
  username text primary key
);
insert into public.reserved_usernames (username) values
  ('admin'), ('api'), ('app'), ('login'), ('logout'), ('signup'), ('register'),
  ('settings'), ('dashboard'), ('profile'), ('help'), ('support'), ('about'),
  ('terms'), ('privacy'), ('pricing'), ('mywork'), ('www'), ('static'), ('public');

-- Anciens pseudos : servent à rediriger et restent réservés à leur propriétaire.
create table public.username_history (
  old_username text primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  changed_at timestamptz not null default now()
);

-- Vérifie qu'un pseudo est libre (ni réservé, ni ancien pseudo d'un autre) à la création et au changement.
create function public.check_username()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.reserved_usernames where username = new.username) then
    raise exception 'Ce pseudo est réservé.' using errcode = '23505';
  end if;
  if exists (
    select 1 from public.username_history
    where old_username = new.username and profile_id <> new.id
  ) then
    raise exception 'Ce pseudo est déjà pris.' using errcode = '23505';
  end if;
  return new;
end;
$$;

create trigger profiles_check_username
  before insert or update of username on public.profiles
  for each row execute function public.check_username();

-- Garde l'ancien pseudo pour la redirection et met à jour la date de modification.
create function public.on_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  if new.username <> old.username then
    insert into public.username_history (old_username, profile_id)
    values (old.username, old.id)
    on conflict (old_username) do update set profile_id = excluded.profile_id, changed_at = now();
    -- Si le propriétaire reprend un de ses anciens pseudos, il n'a plus besoin de redirection.
    delete from public.username_history where old_username = new.username;
  end if;
  return new;
end;
$$;

create trigger profiles_on_update
  before update on public.profiles
  for each row execute function public.on_profile_update();

-- Sécurité (RLS) : lecture publique, écriture réservée au propriétaire.
alter table public.profiles enable row level security;
alter table public.reserved_usernames enable row level security;
alter table public.username_history enable row level security;

create policy "Profils lisibles par tous"
  on public.profiles for select using (true);
create policy "Créer son propre profil"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "Modifier son propre profil"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Pseudos réservés lisibles par tous"
  on public.reserved_usernames for select using (true);
create policy "Anciens pseudos lisibles par tous"
  on public.username_history for select using (true);
-- Aucune policy d'écriture sur username_history : seuls les triggers (security definer) y écrivent.
