-- Vinted V1 (docs/vinted.md, D28) : suivi privé, entièrement manuel.
create table public.vinted_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  brand text check (char_length(brand) <= 60),
  size text check (char_length(size) <= 20),
  condition text check (condition in ('neuf_avec_etiquette', 'neuf_sans_etiquette', 'tres_bon_etat', 'bon_etat', 'satisfaisant')),
  purchase_price_cents integer check (purchase_price_cents between 0 and 10000000),
  listing_price_cents integer check (listing_price_cents between 0 and 10000000),
  sale_price_cents integer check (sale_price_cents between 0 and 10000000),
  buyer text check (char_length(buyer) <= 60),
  carrier text check (carrier in ('vinted_go', 'mondial_relay', 'relais_colis', 'chronopost', 'colissimo', 'autre')),
  tracking_number text check (char_length(tracking_number) <= 60),
  notes text check (char_length(notes) <= 1000),
  status text not null default 'a_publier'
    check (status in ('a_publier', 'en_vente', 'vendu', 'expedie', 'livre', 'termine')),
  listed_at timestamptz,
  sold_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status not in ('vendu', 'expedie', 'livre', 'termine') or sale_price_cents is not null),
  check (status not in ('expedie', 'livre', 'termine') or carrier is not null)
);

create index vinted_items_owner_updated_idx on public.vinted_items (owner_id, updated_at desc);

-- Verrou par propriétaire : deux ajouts simultanés ne doivent pas dépasser le plafond.
-- Droits élevés uniquement pour verrouiller auth.users, inaccessible au client.
create function public.vinted_check_item_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from auth.users u where u.id = new.owner_id for no key update;
  if (select count(*) from public.vinted_items i where i.owner_id = new.owner_id and i.id <> new.id) >= 500 then
    raise exception '500 articles au maximum' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger vinted_items_limit before insert on public.vinted_items
  for each row execute function public.vinted_check_item_limit();
create trigger vinted_items_limit_move before update of owner_id on public.vinted_items
  for each row when (old.owner_id is distinct from new.owner_id)
  execute function public.vinted_check_item_limit();

create function public.vinted_touch_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger vinted_items_touch before update on public.vinted_items
  for each row execute function public.vinted_touch_updated_at();

revoke execute on function public.vinted_check_item_limit() from public, anon, authenticated;
revoke execute on function public.vinted_touch_updated_at() from public, anon, authenticated;

alter table public.vinted_items enable row level security;
create policy "Voir ses articles Vinted" on public.vinted_items
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Ajouter ses articles Vinted" on public.vinted_items
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Modifier ses articles Vinted" on public.vinted_items
  for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Supprimer ses articles Vinted" on public.vinted_items
  for delete to authenticated using ((select auth.uid()) = owner_id);

grant select, insert, delete on public.vinted_items to authenticated;
grant update (title, brand, size, condition, purchase_price_cents, listing_price_cents,
  sale_price_cents, buyer, carrier, tracking_number, notes, status, listed_at, sold_at,
  shipped_at, delivered_at, completed_at) on public.vinted_items to authenticated;
