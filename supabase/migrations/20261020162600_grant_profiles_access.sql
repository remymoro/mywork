-- Droits d'accès aux tables (en plus des règles RLS) : lecture publique, écriture du profil par son propriétaire.
grant select on public.profiles, public.reserved_usernames, public.username_history to anon, authenticated;
grant insert, update on public.profiles to authenticated;
