-- Kanban, étape 1 : seul le propriétaire écrit ; les tableaux publics sont en lecture seule.
create table public.kanban_boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) <= 60 and char_length(btrim(name)) >= 1),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  icon text not null default 'document'
    check (icon in ('document', 'graphique', 'personne', 'dossier', 'etoile', 'cible')),
  is_public boolean not null default false,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique (owner_id, slug)
);

create table public.kanban_lists (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.kanban_boards (id) on delete cascade,
  title text not null check (char_length(title) <= 60 and char_length(btrim(title)) >= 1),
  color text not null default 'rose' check (color in ('rose', 'jaune', 'bleu', 'vert', 'violet', 'gris')),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique (id, board_id)
);

create table public.kanban_cards (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null,
  board_id uuid not null references public.kanban_boards (id) on delete cascade,
  title text not null check (char_length(title) <= 150 and char_length(btrim(title)) >= 1),
  description text not null default '' check (char_length(description) <= 10000),
  position integer not null default 0 check (position >= 0),
  author_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Une carte ne peut pas désigner une liste d'un autre tableau, même via l'API directe.
  foreign key (list_id, board_id) references public.kanban_lists (id, board_id) on delete cascade
);

create table public.kanban_checklist_items (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.kanban_cards (id) on delete cascade,
  text text not null check (char_length(text) <= 200 and char_length(btrim(text)) >= 1),
  done boolean not null default false,
  position integer not null default 0 check (position >= 0)
);

create table public.kanban_comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.kanban_cards (id) on delete cascade,
  author_profile_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) <= 2000 and char_length(btrim(body)) >= 1),
  created_at timestamptz not null default now()
);

create index kanban_boards_owner_position_idx on public.kanban_boards (owner_id, position);
create index kanban_lists_board_position_idx on public.kanban_lists (board_id, position);
create index kanban_cards_list_position_idx on public.kanban_cards (list_id, position);
create index kanban_cards_board_idx on public.kanban_cards (board_id);
create index kanban_cards_author_idx on public.kanban_cards (author_profile_id);
create index kanban_checklist_card_position_idx on public.kanban_checklist_items (card_id, position);
create index kanban_comments_card_created_idx on public.kanban_comments (card_id, created_at);
create index kanban_comments_author_idx on public.kanban_comments (author_profile_id);

-- Verrouiller le parent AVANT de compter empêche deux ajouts simultanés de dépasser la limite.
-- Les positions des ajouts sont aussi attribuées sous ce verrou (pas de doublon à l'ajout rapide).
create function public.kanban_check_list_limit()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.board_id = old.board_id then return new; end if;
  perform 1 from public.kanban_boards b where b.id = new.board_id for update;
  if not found then raise exception 'Tableau introuvable.'; end if;
  if (select count(*) from public.kanban_lists l where l.board_id = new.board_id) >= 5 then
    raise exception '5 listes au maximum' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    select coalesce(max(l.position), -1000) + 1000 into new.position
      from public.kanban_lists l where l.board_id = new.board_id;
  end if;
  return new;
end;
$$;

create trigger kanban_lists_limit before insert or update of board_id on public.kanban_lists
  for each row execute function public.kanban_check_list_limit();

create function public.kanban_check_card_limit()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.list_id = old.list_id then return new; end if;
  -- Même ordre de verrouillage que kanban_move_card : tableau, puis listes.
  perform 1 from public.kanban_boards b where b.id = new.board_id for update;
  perform 1 from public.kanban_lists l
    where l.id = new.list_id and l.board_id = new.board_id for update;
  if not found then raise exception 'Cette liste ne fait pas partie du tableau.'; end if;
  if (select count(*) from public.kanban_cards c where c.list_id = new.list_id) >= 20 then
    raise exception 'Cette liste est pleine : 20 cartes au maximum' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    select coalesce(max(c.position), -1000) + 1000 into new.position
      from public.kanban_cards c where c.list_id = new.list_id;
  end if;
  return new;
end;
$$;

create trigger kanban_cards_limit before insert or update of list_id, board_id on public.kanban_cards
  for each row execute function public.kanban_check_card_limit();

create function public.kanban_check_checklist_limit()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.card_id = old.card_id then return new; end if;
  perform 1 from public.kanban_cards c where c.id = new.card_id for update;
  if not found then raise exception 'Carte introuvable.'; end if;
  if (select count(*) from public.kanban_checklist_items i where i.card_id = new.card_id) >= 30 then
    raise exception '30 éléments de checklist au maximum' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    select coalesce(max(i.position), -1000) + 1000 into new.position
      from public.kanban_checklist_items i where i.card_id = new.card_id;
  end if;
  return new;
end;
$$;

create trigger kanban_checklist_limit before insert or update of card_id on public.kanban_checklist_items
  for each row execute function public.kanban_check_checklist_limit();

create function public.kanban_touch_card()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger kanban_cards_updated before update on public.kanban_cards
  for each row execute function public.kanban_touch_card();

-- Déplacements atomiques : une seule transaction, aucun ordre partiellement enregistré.
create function public.kanban_move_card(card_id uuid, target_list_id uuid, target_index integer)
returns void language plpgsql security invoker set search_path = '' as $$
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
  select c.board_id into v_board_id from public.kanban_cards c where c.id = v_card_id;
  perform 1 from public.kanban_boards b
    where b.id = v_board_id and b.owner_id = auth.uid() for update;
  if not found then raise exception 'Carte introuvable ou accès refusé.'; end if;

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

create function public.kanban_move_list(list_id uuid, target_index integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_list_id uuid := $1;
  v_target_index integer := $2;
  v_board_id uuid;
  v_ids uuid[];
  v_count integer;
  v_position integer;
  v_existing_index integer := 1;
begin
  if auth.uid() is null then raise exception 'Connecte-toi pour déplacer une liste.'; end if;
  if v_target_index is null or v_target_index < 0 then raise exception 'Position invalide.'; end if;
  select l.board_id into v_board_id from public.kanban_lists l where l.id = v_list_id;
  perform 1 from public.kanban_boards b
    where b.id = v_board_id and b.owner_id = auth.uid() for update;
  if not found then raise exception 'Liste introuvable ou accès refusé.'; end if;
  perform 1 from public.kanban_lists l where l.id = v_list_id and l.board_id = v_board_id for update;
  if not found then raise exception 'Liste introuvable.'; end if;

  select coalesce(array_agg(l.id order by l.position, l.created_at, l.id), '{}'::uuid[])
    into v_ids from public.kanban_lists l where l.board_id = v_board_id and l.id <> v_list_id;
  v_count := cardinality(v_ids);
  v_target_index := least(v_target_index, v_count);
  for v_position in 0..v_count loop
    if v_position = v_target_index then
      update public.kanban_lists l set position = v_position * 1000
        where l.id = v_list_id and l.board_id = v_board_id;
    else
      update public.kanban_lists l set position = v_position * 1000
        where l.id = v_ids[v_existing_index] and l.board_id = v_board_id;
      v_existing_index := v_existing_index + 1;
    end if;
  end loop;
end;
$$;

-- Les fonctions de déclencheur ne sont pas des API ; seuls les déplacements sont appelables.
revoke execute on function public.kanban_check_list_limit() from public, anon, authenticated;
revoke execute on function public.kanban_check_card_limit() from public, anon, authenticated;
revoke execute on function public.kanban_check_checklist_limit() from public, anon, authenticated;
revoke execute on function public.kanban_touch_card() from public, anon, authenticated;
revoke execute on function public.kanban_move_card(uuid, uuid, integer) from public, anon;
revoke execute on function public.kanban_move_list(uuid, integer) from public, anon;
grant execute on function public.kanban_move_card(uuid, uuid, integer) to authenticated;
grant execute on function public.kanban_move_list(uuid, integer) to authenticated;

alter table public.kanban_boards enable row level security;
create policy "Voir ses tableaux ou les tableaux publics en ligne" on public.kanban_boards
  for select using (
    owner_id = (select auth.uid())
    or (is_public and exists (select 1 from public.profiles p where p.id = owner_id and p.is_online))
  );
create policy "Créer ses tableaux" on public.kanban_boards
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Modifier ses tableaux" on public.kanban_boards
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Supprimer ses tableaux" on public.kanban_boards
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Les sous-requêtes héritent de la RLS des parents : aucun tableau public hors ligne ne fuit.
do $$
declare
  t text;
  readable text;
  owned text;
begin
  foreach t in array array['kanban_lists', 'kanban_cards', 'kanban_checklist_items', 'kanban_comments'] loop
    if t in ('kanban_lists', 'kanban_cards') then
      readable := 'exists (select 1 from public.kanban_boards b where b.id = board_id)';
      owned := 'exists (select 1 from public.kanban_boards b where b.id = board_id and b.owner_id = (select auth.uid()))';
    else
      readable := 'exists (select 1 from public.kanban_cards c where c.id = card_id)';
      owned := 'exists (select 1 from public.kanban_cards c join public.kanban_boards b on b.id = c.board_id where c.id = card_id and b.owner_id = (select auth.uid()))';
    end if;
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Lire les éléments des tableaux accessibles" on public.%I for select using (%s)', t, readable);
    execute format('create policy "Créer les éléments de ses tableaux" on public.%I for insert to authenticated with check (%s)', t, owned);
    execute format('create policy "Modifier les éléments de ses tableaux" on public.%I for update to authenticated using (%s) with check (%s)', t, owned, owned);
    execute format('create policy "Supprimer les éléments de ses tableaux" on public.%I for delete to authenticated using (%s)', t, owned);
  end loop;
end;
$$;

-- Sur ce projet, les nouvelles tables demandent des GRANT explicites (D13).
grant select on public.kanban_boards, public.kanban_lists, public.kanban_cards,
  public.kanban_checklist_items, public.kanban_comments to anon, authenticated;
grant insert, update, delete on public.kanban_boards, public.kanban_lists, public.kanban_cards,
  public.kanban_checklist_items, public.kanban_comments to authenticated;
revoke insert, update, delete on public.kanban_boards, public.kanban_lists, public.kanban_cards,
  public.kanban_checklist_items, public.kanban_comments from anon;
