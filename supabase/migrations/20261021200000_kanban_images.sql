-- Kanban, étape 3 : images des cartes (docs/kanban.md). 5 par carte, 2 Mo, stockage PRIVÉ.
-- Les fichiers ne sont lus que par des adresses signées de courte durée, créées côté serveur :
-- un tableau privé n'expose donc jamais ses images, même si quelqu'un devine leur chemin.

create table public.kanban_card_images (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.kanban_cards (id) on delete cascade,
  board_id uuid not null references public.kanban_boards (id) on delete cascade,
  -- Chemin dans le dossier « kanban-images » : <propriétaire>/<tableau>/<carte>/<fichier>.
  path text not null unique check (char_length(path) <= 300),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

create index kanban_card_images_card_position_idx on public.kanban_card_images (card_id, position);
create index kanban_card_images_board_idx on public.kanban_card_images (board_id);

-- Même principe que les autres limites (20261021190000) : verrou sur la carte, puis comptage.
create function public.kanban_check_image_limit()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.kanban_cards c
    where c.id = new.card_id and c.board_id = new.board_id for update;
  if not found then raise exception 'Carte introuvable.'; end if;
  if (select count(*) from public.kanban_card_images i where i.card_id = new.card_id) >= 5 then
    raise exception '5 images au maximum par carte' using errcode = '23514';
  end if;
  select coalesce(max(i.position), -1000) + 1000 into new.position
    from public.kanban_card_images i where i.card_id = new.card_id;
  return new;
end;
$$;

create trigger kanban_card_images_limit before insert on public.kanban_card_images
  for each row execute function public.kanban_check_image_limit();

revoke execute on function public.kanban_check_image_limit() from public, anon, authenticated;

-- Lecture : comme la carte (héritée de la RLS des tableaux). Écriture : le propriétaire du tableau.
alter table public.kanban_card_images enable row level security;
create policy "Lire les images des cartes accessibles" on public.kanban_card_images
  for select using (exists (select 1 from public.kanban_cards c where c.id = card_id));
create policy "Ajouter des images à ses cartes" on public.kanban_card_images
  for insert to authenticated with check (
    exists (select 1 from public.kanban_boards b where b.id = board_id and b.owner_id = (select auth.uid()))
    and (storage.foldername(path))[1] = (select auth.uid())::text
  );
create policy "Supprimer les images de ses cartes" on public.kanban_card_images
  for delete to authenticated using (
    exists (select 1 from public.kanban_boards b where b.id = board_id and b.owner_id = (select auth.uid()))
  );

grant select on public.kanban_card_images to anon, authenticated;
grant insert, delete on public.kanban_card_images to authenticated;

-- Dossier privé : aucune adresse publique.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kanban-images', 'kanban-images', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Lire (et donc signer une adresse) : le propriétaire dans son dossier, ou n'importe qui pour une
-- image enregistrée d'un tableau qu'il a le droit de voir (la RLS de kanban_card_images s'applique).
create policy "Voir les images Kanban accessibles" on storage.objects
  for select using (
    bucket_id = 'kanban-images' and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (select 1 from public.kanban_card_images i where i.path = name)
    )
  );
create policy "Déposer ses images Kanban" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'kanban-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Supprimer ses images Kanban" on storage.objects
  for delete to authenticated
  using (bucket_id = 'kanban-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
