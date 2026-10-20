-- Les fonctions de déclencheur (triggers) n'ont pas à être appelables depuis l'API publique.
revoke execute on function public.check_username() from public, anon, authenticated;
revoke execute on function public.on_profile_update() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
