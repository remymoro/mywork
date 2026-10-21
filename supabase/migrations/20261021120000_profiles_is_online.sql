-- Interrupteur « Profil en ligne » : un profil hors ligne n'est visible que par son propriétaire.
alter table public.profiles add column is_online boolean not null default true;

drop policy "Profils lisibles par tous" on public.profiles;
create policy "Profils en ligne lisibles par tous, le sien toujours"
  on public.profiles for select
  using (is_online or (select auth.uid()) = id);
