-- Kanban révisé (docs/kanban.md, 2026-10-21) : plus aucune visibilité publique ; un tableau se
-- partage avec d'autres utilisateurs connectés (« membres »). Un membre crée ses cartes et fait tout
-- dessus, sans toucher aux cartes des autres ; il commente toutes les cartes. Le propriétaire peut tout.
-- Limites : 10 tableaux créés par utilisateur, 10 membres par tableau.

-- 1. Fin du public : plus de colonne, plus aucune lecture pour anon.
drop policy "Voir ses tableaux ou les tableaux publics en ligne" on public.kanban_boards;
alter table public.kanban_boards drop column is_public;
revoke select on public.kanban_boards, public.kanban_lists, public.kanban_cards,
  public.kanban_checklist_items, public.kanban_comments, public.kanban_card_images from anon;

-- 2. Membres d'un tableau.
create table public.kanban_board_members (
  board_id uuid not null references public.kanban_boards (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (board_id, member_id)
);
create index kanban_board_members_member_idx on public.kanban_board_members (member_id);

-- 3. Fonctions d'accès. « security definer » : elles lisent les tables sans repasser par la RLS,
-- ce qui évite qu'une règle sur les tableaux interroge les membres et inversement, à l'infini.
create function public.kanban_is_owner(board uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.kanban_boards b where b.id = board and b.owner_id = auth.uid());
$$;

create function public.kanban_is_member(board uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.kanban_board_members m where m.board_id = board and m.member_id = auth.uid()
  );
$$;

create function public.kanban_has_access(board uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.kanban_is_owner(board) or public.kanban_is_member(board);
$$;

-- Modifier une carte (titre, description, déplacement, images, checklist, suppression) :
-- le propriétaire du tableau, ou l'auteur de la carte s'il est encore membre.
create function public.kanban_can_edit_card(card uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.kanban_cards c
    where c.id = card and (
      public.kanban_is_owner(c.board_id)
      or (c.author_profile_id = auth.uid() and public.kanban_is_member(c.board_id))
    )
  );
$$;

create function public.kanban_card_board(card uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select c.board_id from public.kanban_cards c where c.id = card;
$$;

revoke execute on function public.kanban_is_owner(uuid), public.kanban_is_member(uuid),
  public.kanban_has_access(uuid), public.kanban_can_edit_card(uuid), public.kanban_card_board(uuid)
  from public, anon;
grant execute on function public.kanban_is_owner(uuid), public.kanban_is_member(uuid),
  public.kanban_has_access(uuid), public.kanban_can_edit_card(uuid), public.kanban_card_board(uuid)
  to authenticated;

-- 4. Règles d'accès (RLS), réécrites autour du propriétaire et des membres.
create policy "Voir ses tableaux et ceux qu'on partage avec soi" on public.kanban_boards
  for select to authenticated using (owner_id = (select auth.uid()) or public.kanban_is_member(id));

alter table public.kanban_board_members enable row level security;
create policy "Voir les membres des tableaux accessibles" on public.kanban_board_members
  for select to authenticated using (public.kanban_has_access(board_id));
create policy "Le propriétaire ajoute des membres" on public.kanban_board_members
  for insert to authenticated with check (public.kanban_is_owner(board_id));
create policy "Retirer un membre, ou quitter le tableau" on public.kanban_board_members
  for delete to authenticated using (public.kanban_is_owner(board_id) or member_id = (select auth.uid()));
grant select, insert, delete on public.kanban_board_members to authenticated;

-- Listes : lecture par les membres ; écriture inchangée (propriétaire seul).
drop policy "Lire les éléments des tableaux accessibles" on public.kanban_lists;
create policy "Lire les listes des tableaux accessibles" on public.kanban_lists
  for select to authenticated using (public.kanban_has_access(board_id));

-- Cartes : chacun crée les siennes ; on ne modifie que celles qu'on peut éditer.
drop policy "Lire les éléments des tableaux accessibles" on public.kanban_cards;
drop policy "Créer les éléments de ses tableaux" on public.kanban_cards;
drop policy "Modifier les éléments de ses tableaux" on public.kanban_cards;
drop policy "Supprimer les éléments de ses tableaux" on public.kanban_cards;
create policy "Lire les cartes des tableaux accessibles" on public.kanban_cards
  for select to authenticated using (public.kanban_has_access(board_id));
create policy "Créer ses cartes" on public.kanban_cards
  for insert to authenticated
  with check (public.kanban_has_access(board_id) and author_profile_id = (select auth.uid()));
create policy "Modifier les cartes qu'on peut éditer" on public.kanban_cards
  for update to authenticated
  using (public.kanban_can_edit_card(id))
  with check (
    public.kanban_is_owner(board_id)
    or (author_profile_id = (select auth.uid()) and public.kanban_is_member(board_id))
  );
create policy "Supprimer les cartes qu'on peut éditer" on public.kanban_cards
  for delete to authenticated using (public.kanban_can_edit_card(id));

-- Checklist : comme la carte.
drop policy "Lire les éléments des tableaux accessibles" on public.kanban_checklist_items;
drop policy "Créer les éléments de ses tableaux" on public.kanban_checklist_items;
drop policy "Modifier les éléments de ses tableaux" on public.kanban_checklist_items;
drop policy "Supprimer les éléments de ses tableaux" on public.kanban_checklist_items;
create policy "Lire la checklist des cartes accessibles" on public.kanban_checklist_items
  for select to authenticated using (public.kanban_has_access(public.kanban_card_board(card_id)));
create policy "Gérer la checklist des cartes qu'on peut éditer (ajout)" on public.kanban_checklist_items
  for insert to authenticated with check (public.kanban_can_edit_card(card_id));
create policy "Gérer la checklist des cartes qu'on peut éditer (modification)" on public.kanban_checklist_items
  for update to authenticated
  using (public.kanban_can_edit_card(card_id)) with check (public.kanban_can_edit_card(card_id));
create policy "Gérer la checklist des cartes qu'on peut éditer (suppression)" on public.kanban_checklist_items
  for delete to authenticated using (public.kanban_can_edit_card(card_id));

-- Commentaires : tout le monde commente toutes les cartes ; on supprime les siens (le propriétaire, tous).
drop policy "Lire les éléments des tableaux accessibles" on public.kanban_comments;
drop policy "Créer les éléments de ses tableaux" on public.kanban_comments;
drop policy "Modifier les éléments de ses tableaux" on public.kanban_comments;
drop policy "Supprimer les éléments de ses tableaux" on public.kanban_comments;
create policy "Lire les commentaires des cartes accessibles" on public.kanban_comments
  for select to authenticated using (public.kanban_has_access(public.kanban_card_board(card_id)));
create policy "Commenter les cartes accessibles" on public.kanban_comments
  for insert to authenticated with check (
    public.kanban_has_access(public.kanban_card_board(card_id))
    and author_profile_id = (select auth.uid())
  );
create policy "Supprimer ses commentaires (le propriétaire : tous)" on public.kanban_comments
  for delete to authenticated using (
    author_profile_id = (select auth.uid()) or public.kanban_is_owner(public.kanban_card_board(card_id))
  );
revoke update on public.kanban_comments from authenticated;

-- Images : comme la carte ; chacun dépose dans son dossier <utilisateur>/<tableau>/<carte>/.
drop policy "Lire les images des cartes accessibles" on public.kanban_card_images;
drop policy "Ajouter des images à ses cartes" on public.kanban_card_images;
drop policy "Supprimer les images de ses cartes" on public.kanban_card_images;
create policy "Lire les images des cartes accessibles" on public.kanban_card_images
  for select to authenticated using (public.kanban_has_access(board_id));
create policy "Ajouter des images aux cartes qu'on peut éditer" on public.kanban_card_images
  for insert to authenticated with check (
    public.kanban_can_edit_card(card_id)
    and public.kanban_card_board(card_id) = board_id
    and (storage.foldername(path))[1] = (select auth.uid())::text
  );
create policy "Supprimer les images des cartes qu'on peut éditer" on public.kanban_card_images
  for delete to authenticated using (public.kanban_can_edit_card(card_id));

drop policy "Voir les images Kanban accessibles" on storage.objects;
drop policy "Supprimer ses images Kanban" on storage.objects;
create policy "Voir les images Kanban accessibles" on storage.objects
  for select to authenticated using (
    bucket_id = 'kanban-images' and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (select 1 from public.kanban_card_images i where i.path = name)
    )
  );
-- Le propriétaire du tableau (2ᵉ dossier du chemin) peut aussi effacer les fichiers de ses membres.
create policy "Supprimer ses images Kanban" on storage.objects
  for delete to authenticated using (
    bucket_id = 'kanban-images' and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.kanban_boards b
        where b.id::text = (storage.foldername(name))[2] and b.owner_id = (select auth.uid())
      )
    )
  );

-- 5. Déclencheurs de limites : ils verrouillent le tableau ou la liste, ce qu'un membre n'a pas le
-- droit de faire en son nom. Ils passent donc en « security definer » (ils ne font que compter).
alter function public.kanban_check_list_limit() security definer;
alter function public.kanban_check_card_limit() security definer;
alter function public.kanban_check_checklist_limit() security definer;
alter function public.kanban_check_image_limit() security definer;

create function public.kanban_check_board_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.profiles p where p.id = new.owner_id for update;
  if (select count(*) from public.kanban_boards b where b.owner_id = new.owner_id) >= 10 then
    raise exception '10 tableaux au maximum' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger kanban_boards_limit before insert on public.kanban_boards
  for each row execute function public.kanban_check_board_limit();

create function public.kanban_check_member()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.kanban_boards b where b.id = new.board_id for update;
  if exists (select 1 from public.kanban_boards b where b.id = new.board_id and b.owner_id = new.member_id) then
    raise exception 'Tu es déjà propriétaire de ce tableau.' using errcode = '23514';
  end if;
  if (select count(*) from public.kanban_board_members m where m.board_id = new.board_id) >= 10 then
    raise exception '10 membres au maximum' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger kanban_board_members_check before insert on public.kanban_board_members
  for each row execute function public.kanban_check_member();

revoke execute on function public.kanban_check_board_limit(), public.kanban_check_member()
  from public, anon, authenticated;

-- 6. Déplacer une carte : le propriétaire, ou l'auteur membre pour ses cartes. La fonction passe en
-- « security definer » pour renuméroter aussi les cartes des autres, après avoir vérifié les droits.
create or replace function public.kanban_move_card(card_id uuid, target_list_id uuid, target_index integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_card_id uuid := $1;
  v_target_id uuid := $2;
  v_target_index integer := $3;
  v_board_id uuid;
  v_source_id uuid;
  v_ids uuid[];
  v_count integer;
  v_position integer;
  v_existing_index integer := 1;
begin
  if auth.uid() is null then raise exception 'Connecte-toi pour déplacer une carte.'; end if;
  if v_target_index is null or v_target_index < 0 then raise exception 'Position invalide.'; end if;
  if not public.kanban_can_edit_card(v_card_id) then
    raise exception 'Carte introuvable ou accès refusé.';
  end if;
  select c.board_id into v_board_id from public.kanban_cards c where c.id = v_card_id;
  perform 1 from public.kanban_boards b where b.id = v_board_id for update;

  -- Relire après le verrou du tableau : une autre requête a pu déplacer la carte entre-temps.
  select c.list_id into v_source_id from public.kanban_cards c
    where c.id = v_card_id and c.board_id = v_board_id for update;
  if not found then raise exception 'Carte introuvable.'; end if;
  if not exists (select 1 from public.kanban_lists l where l.id = v_target_id and l.board_id = v_board_id) then
    raise exception 'La carte et la liste doivent appartenir au même tableau.';
  end if;
  perform 1 from public.kanban_lists l where l.id in (v_source_id, v_target_id) order by l.id for update;

  select coalesce(array_agg(c.id order by c.position, c.created_at, c.id), '{}'::uuid[])
    into v_ids from public.kanban_cards c where c.list_id = v_target_id and c.id <> v_card_id;
  v_count := cardinality(v_ids);
  if v_source_id <> v_target_id and v_count >= 20 then
    raise exception 'Cette liste est pleine : 20 cartes au maximum' using errcode = '23514';
  end if;
  v_target_index := least(v_target_index, v_count);

  for v_position in 0..v_count loop
    if v_position = v_target_index then
      update public.kanban_cards c set list_id = v_target_id, position = v_position * 1000
        where c.id = v_card_id and c.board_id = v_board_id;
    else
      update public.kanban_cards c set position = v_position * 1000
        where c.id = v_ids[v_existing_index] and c.board_id = v_board_id;
      v_existing_index := v_existing_index + 1;
    end if;
  end loop;
  if v_source_id <> v_target_id then
    with ordered as (
      select c.id, ((row_number() over (order by c.position, c.created_at, c.id) - 1) * 1000)::integer as position
        from public.kanban_cards c where c.list_id = v_source_id
    )
    update public.kanban_cards c set position = ordered.position from ordered where c.id = ordered.id;
  end if;
end;
$$;
revoke execute on function public.kanban_move_card(uuid, uuid, integer) from public, anon;
grant execute on function public.kanban_move_card(uuid, uuid, integer) to authenticated;

-- 7. Inviter par pseudo : le profil invité peut être hors ligne, donc illisible par la RLS des profils.
create function public.kanban_invite_member(board uuid, username text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_member uuid;
begin
  if not public.kanban_is_owner(board) then raise exception 'Seul le propriétaire peut partager ce tableau.'; end if;
  select p.id into v_member from public.profiles p where p.username = lower(btrim($2));
  if v_member is null then raise exception 'Aucun utilisateur de MyWork avec ce pseudo.' using errcode = 'P0002'; end if;
  insert into public.kanban_board_members (board_id, member_id) values (board, v_member)
    on conflict (board_id, member_id) do nothing;
  return v_member;
end;
$$;

-- Noms des personnes d'un tableau (propriétaire et membres), même si leur profil est hors ligne.
create function public.kanban_board_people(board uuid)
returns table (id uuid, display_name text, username text, is_owner boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name, p.username, (p.id = b.owner_id)
  from public.kanban_boards b
  join public.profiles p
    on p.id = b.owner_id
    or p.id in (select m.member_id from public.kanban_board_members m where m.board_id = b.id)
  where b.id = board and public.kanban_has_access(board);
$$;

revoke execute on function public.kanban_invite_member(uuid, text), public.kanban_board_people(uuid)
  from public, anon;
grant execute on function public.kanban_invite_member(uuid, text), public.kanban_board_people(uuid)
  to authenticated;
