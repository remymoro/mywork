-- Rendez-vous (docs/rendez-vous.md, D26) : horaires du propriétaire, exceptions, réservations sans compte.
-- Les visiteurs n'ont AUCUN accès direct aux tables : tout passe par des fonctions (security definer) qui
-- revalident toutes les règles (créneau ouvert, préavis 4 h, horizon 2 mois, pas de double réservation).
-- Heure de référence : Europe/Paris (D26).

create extension if not exists btree_gist;

create table public.rdv_settings (
  owner_id uuid primary key references public.profiles (id) on delete cascade,
  -- Tant que la réservation n'est pas activée, l'onglet « Rendez-vous » n'existe pas sur le profil public.
  enabled boolean not null default false,
  durations smallint[] not null default '{30}'
    check (cardinality(durations) between 1 and 3 and durations <@ array[15, 30, 60]::smallint[]),
  created_at timestamptz not null default now()
);

-- Plages hebdomadaires. weekday : 1 = lundi … 7 = dimanche (norme ISO).
create table public.rdv_hours (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time),
  unique (owner_id, weekday, start_time)
);

-- Exceptions : sans heures = jour fermé ; avec heures = ces plages remplacent les horaires habituels ce jour-là.
create table public.rdv_exceptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  start_time time,
  end_time time,
  check (
    (start_time is null and end_time is null)
    or (start_time is not null and end_time is not null and end_time > start_time)
  )
);
create index rdv_exceptions_owner_day_idx on public.rdv_exceptions (owner_id, day);

create table public.rdv_appointments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  duration_min smallint not null check (duration_min in (15, 30, 60)),
  guest_first text not null check (char_length(guest_first) between 1 and 80),
  guest_last text not null check (char_length(guest_last) between 1 and 80),
  guest_email text not null check (char_length(guest_email) between 3 and 254 and position('@' in guest_email) > 1),
  message text not null default '' check (char_length(message) <= 1000),
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  cancelled_by text check (cancelled_by in ('guest', 'owner')),
  -- Lien privé du visiteur (annuler, reporter) : valeur aléatoire, impossible à deviner.
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  check (ends_at = starts_at + duration_min * interval '1 minute'),
  -- Pas de double réservation : deux rendez-vous confirmés d'un même propriétaire ne se chevauchent jamais.
  exclude using gist (owner_id with =, tstzrange(starts_at, ends_at) with &&) where (status = 'confirmed')
);
create index rdv_appointments_owner_start_idx on public.rdv_appointments (owner_id, starts_at);
create index rdv_appointments_email_idx on public.rdv_appointments (owner_id, lower(guest_email));

-- Sécurité : le propriétaire gère ses réglages ; il ne fait que LIRE ses rendez-vous (les changements
-- passent par les fonctions plus bas) ; les visiteurs n'ont aucun droit direct.
alter table public.rdv_settings enable row level security;
alter table public.rdv_hours enable row level security;
alter table public.rdv_exceptions enable row level security;
alter table public.rdv_appointments enable row level security;

create policy "rdv_settings_owner" on public.rdv_settings
  for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "rdv_hours_owner" on public.rdv_hours
  for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "rdv_exceptions_owner" on public.rdv_exceptions
  for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "rdv_appointments_owner_read" on public.rdv_appointments
  for select to authenticated
  using ((select auth.uid()) = owner_id);

grant select, insert, update, delete on public.rdv_settings, public.rdv_hours, public.rdv_exceptions to authenticated;
grant select on public.rdv_appointments to authenticated;

-- Fonctions internes (jamais appelables depuis l'API) ---------------------------------------------

-- Le créneau [début, fin] tombe-t-il dans les plages ouvertes du propriétaire ce jour-là (heure de Paris) ?
create function public.rdv_is_open(p_owner uuid, p_start timestamptz, p_end timestamptz)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  ls timestamp := p_start at time zone 'Europe/Paris';
  le timestamp := p_end at time zone 'Europe/Paris';
  d date := (p_start at time zone 'Europe/Paris')::date;
begin
  if le::date <> d then return false; end if;
  if exists (select 1 from public.rdv_exceptions e where e.owner_id = p_owner and e.day = d and e.start_time is null) then
    return false;
  end if;
  if exists (select 1 from public.rdv_exceptions e where e.owner_id = p_owner and e.day = d) then
    return exists (
      select 1 from public.rdv_exceptions e
      where e.owner_id = p_owner and e.day = d and e.start_time <= ls::time and e.end_time >= le::time
    );
  end if;
  return exists (
    select 1 from public.rdv_hours h
    where h.owner_id = p_owner and h.weekday = extract(isodow from ls)::int
      and h.start_time <= ls::time and h.end_time >= le::time
  );
end;
$$;

-- Toutes les règles d'un créneau : durée proposée, préavis 4 h, horizon 2 mois, minutes rondes, plage ouverte.
create function public.rdv_validate_slot(p_owner uuid, p_start timestamptz, p_duration smallint)
returns void language plpgsql stable security definer set search_path = '' as $$
declare
  s public.rdv_settings;
  ls timestamp := p_start at time zone 'Europe/Paris';
begin
  select * into s from public.rdv_settings where owner_id = p_owner and enabled;
  if not found
     or not (p_duration = any (s.durations))
     or p_start < now() + interval '4 hours'
     or p_start > now() + interval '2 months'
     or extract(second from ls) <> 0
     or (extract(minute from ls))::int % 5 <> 0
     or not public.rdv_is_open(p_owner, p_start, p_start + p_duration * interval '1 minute')
  then
    raise exception 'rdv_invalid' using errcode = 'P0001';
  end if;
end;
$$;

-- Description d'un rendez-vous pour l'application (e-mails, pages). owner_email = e-mail de contact du profil.
create function public.rdv_describe(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', a.id, 'token', a.token, 'status', a.status,
    'starts_at', a.starts_at, 'ends_at', a.ends_at, 'duration_min', a.duration_min,
    'guest_first', a.guest_first, 'guest_last', a.guest_last, 'guest_email', a.guest_email, 'message', a.message,
    'owner_username', p.username, 'owner_name', coalesce(p.display_name, p.username), 'owner_email', p.contact_email
  )
  from public.rdv_appointments a join public.profiles p on p.id = a.owner_id
  where a.id = p_id
$$;

create function public.rdv_do_cancel(p_id uuid, p_by text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  update public.rdv_appointments
     set status = 'cancelled', cancelled_by = p_by
   where id = p_id and status = 'confirmed' and starts_at > now();
  if not found then raise exception 'rdv_invalid' using errcode = 'P0001'; end if;
  return public.rdv_describe(p_id);
end;
$$;

create function public.rdv_do_reschedule(p_id uuid, p_new_start timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  a public.rdv_appointments;
  before jsonb;
begin
  select * into a from public.rdv_appointments where id = p_id and status = 'confirmed' and starts_at > now() for update;
  if not found then raise exception 'rdv_invalid' using errcode = 'P0001'; end if;
  perform public.rdv_validate_slot(a.owner_id, p_new_start, a.duration_min);
  before := public.rdv_describe(p_id);
  begin
    update public.rdv_appointments
       set starts_at = p_new_start, ends_at = p_new_start + a.duration_min * interval '1 minute'
     where id = p_id;
  exception when exclusion_violation then
    raise exception 'rdv_slot_taken' using errcode = 'P0001';
  end;
  return jsonb_build_object('before', before, 'after', public.rdv_describe(p_id));
end;
$$;

revoke execute on function public.rdv_is_open(uuid, timestamptz, timestamptz),
  public.rdv_validate_slot(uuid, timestamptz, smallint), public.rdv_describe(uuid),
  public.rdv_do_cancel(uuid, text), public.rdv_do_reschedule(uuid, timestamptz)
  from public, anon, authenticated;

-- Fonctions publiques (visiteurs, sans compte) ----------------------------------------------------

-- Ce qu'il faut pour calculer les créneaux libres. Aucune donnée personnelle : seulement des plages occupées.
create function public.rdv_public_config(p_username text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_owner uuid;
  s public.rdv_settings;
begin
  select p.id into v_owner from public.profiles p where p.username = p_username and p.is_online;
  if not found then return null; end if;
  select * into s from public.rdv_settings where owner_id = v_owner and enabled;
  if not found then return null; end if;
  return jsonb_build_object(
    'durations', to_jsonb(s.durations),
    'hours', (select coalesce(jsonb_agg(jsonb_build_object(
        'weekday', h.weekday, 'start', to_char(h.start_time, 'HH24:MI'), 'end', to_char(h.end_time, 'HH24:MI'))), '[]'::jsonb)
      from public.rdv_hours h where h.owner_id = v_owner),
    'exceptions', (select coalesce(jsonb_agg(jsonb_build_object(
        'day', e.day, 'start', to_char(e.start_time, 'HH24:MI'), 'end', to_char(e.end_time, 'HH24:MI'))), '[]'::jsonb)
      from public.rdv_exceptions e
      where e.owner_id = v_owner and e.day between (now() at time zone 'Europe/Paris')::date - 1
        and (now() at time zone 'Europe/Paris')::date + 70),
    'busy', (select coalesce(jsonb_agg(jsonb_build_object('start', a.starts_at, 'end', a.ends_at)), '[]'::jsonb)
      from public.rdv_appointments a
      where a.owner_id = v_owner and a.status = 'confirmed' and a.ends_at > now() and a.starts_at < now() + interval '70 days')
  );
end;
$$;

create function public.rdv_book(
  p_username text, p_start timestamptz, p_duration smallint,
  p_first text, p_last text, p_email text, p_message text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_id uuid;
  v_email text := lower(btrim(p_email));
begin
  select p.id into v_owner from public.profiles p where p.username = p_username and p.is_online;
  if not found then raise exception 'rdv_invalid' using errcode = 'P0001'; end if;
  perform public.rdv_validate_slot(v_owner, p_start, p_duration);

  -- Anti-abus : 3 rendez-vous à venir par e-mail, 5 réservations par heure et par e-mail, 30 par heure au total.
  if (select count(*) from public.rdv_appointments a
        where a.owner_id = v_owner and lower(a.guest_email) = v_email and a.status = 'confirmed' and a.starts_at > now()) >= 3
     or (select count(*) from public.rdv_appointments a
        where a.owner_id = v_owner and lower(a.guest_email) = v_email and a.created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.rdv_appointments a
        where a.owner_id = v_owner and a.created_at > now() - interval '1 hour') >= 30
  then
    raise exception 'rdv_limit' using errcode = 'P0001';
  end if;

  begin
    insert into public.rdv_appointments (owner_id, starts_at, ends_at, duration_min, guest_first, guest_last, guest_email, message)
    values (v_owner, p_start, p_start + p_duration * interval '1 minute', p_duration,
            btrim(p_first), btrim(p_last), v_email, btrim(coalesce(p_message, '')))
    returning id into v_id;
  exception
    when exclusion_violation then raise exception 'rdv_slot_taken' using errcode = 'P0001';
    when check_violation then raise exception 'rdv_invalid' using errcode = 'P0001';
  end;
  return public.rdv_describe(v_id);
end;
$$;

create function public.rdv_get(p_token uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select public.rdv_describe(a.id) from public.rdv_appointments a where a.token = p_token
$$;

create function public.rdv_cancel(p_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select a.id into v_id from public.rdv_appointments a where a.token = p_token;
  if not found then raise exception 'rdv_invalid' using errcode = 'P0001'; end if;
  return public.rdv_do_cancel(v_id, 'guest');
end;
$$;

create function public.rdv_reschedule(p_token uuid, p_new_start timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select a.id into v_id from public.rdv_appointments a where a.token = p_token;
  if not found then raise exception 'rdv_invalid' using errcode = 'P0001'; end if;
  return public.rdv_do_reschedule(v_id, p_new_start);
end;
$$;

revoke execute on function public.rdv_public_config(text),
  public.rdv_book(text, timestamptz, smallint, text, text, text, text),
  public.rdv_get(uuid), public.rdv_cancel(uuid), public.rdv_reschedule(uuid, timestamptz)
  from public;
grant execute on function public.rdv_public_config(text),
  public.rdv_book(text, timestamptz, smallint, text, text, text, text),
  public.rdv_get(uuid), public.rdv_cancel(uuid), public.rdv_reschedule(uuid, timestamptz)
  to anon, authenticated;

-- Fonctions du propriétaire (connecté) ------------------------------------------------------------

create function public.rdv_owner_cancel(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.rdv_appointments a where a.id = p_id and a.owner_id = (select auth.uid())) then
    raise exception 'rdv_invalid' using errcode = 'P0001';
  end if;
  return public.rdv_do_cancel(p_id, 'owner');
end;
$$;

create function public.rdv_owner_reschedule(p_id uuid, p_new_start timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.rdv_appointments a where a.id = p_id and a.owner_id = (select auth.uid())) then
    raise exception 'rdv_invalid' using errcode = 'P0001';
  end if;
  return public.rdv_do_reschedule(p_id, p_new_start);
end;
$$;

revoke execute on function public.rdv_owner_cancel(uuid), public.rdv_owner_reschedule(uuid, timestamptz)
  from public, anon;
grant execute on function public.rdv_owner_cancel(uuid), public.rdv_owner_reschedule(uuid, timestamptz)
  to authenticated;
