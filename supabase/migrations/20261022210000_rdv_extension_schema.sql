-- Audit Supabase (« extension_in_public ») : btree_gist, utilisée par la contrainte anti-double réservation
-- des rendez-vous, va dans le schéma « extensions », hors de l'API publique. La contrainte n'est pas touchée.
alter extension btree_gist set schema extensions;
