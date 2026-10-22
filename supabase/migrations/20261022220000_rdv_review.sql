-- Corrections après relecture de Codex (2026-10-22), module Rendez-vous (docs/rendez-vous.md).

-- 1. Plages aux minutes multiples de 5 (sinon l'écran proposerait 09:02, refusé par rdv_validate_slot).
alter table public.rdv_hours
  add constraint rdv_hours_round_minutes check (
    extract(minute from start_time)::int % 5 = 0 and extract(minute from end_time)::int % 5 = 0
    and extract(second from start_time) = 0 and extract(second from end_time) = 0
  );
alter table public.rdv_exceptions
  add constraint rdv_exceptions_round_minutes check (
    start_time is null or (
      extract(minute from start_time)::int % 5 = 0 and extract(minute from end_time)::int % 5 = 0
      and extract(second from start_time) = 0 and extract(second from end_time) = 0
    )
  );

-- 2. Nuit du changement d'heure : un créneau dont la durée « à l'horloge de Paris » diffère de sa vraie durée
-- traverse le changement ; il est refusé (les comparaisons d'heures locales ne seraient plus fiables).
create or replace function public.rdv_is_open(p_owner uuid, p_start timestamptz, p_end timestamptz)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  ls timestamp := p_start at time zone 'Europe/Paris';
  le timestamp := p_end at time zone 'Europe/Paris';
  d date := (p_start at time zone 'Europe/Paris')::date;
begin
  if le::date <> d or le - ls <> p_end - p_start then return false; end if;
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

-- 3. Limites anti-abus : verrou sur l'agenda du propriétaire avant les comptages, pour que des réservations
-- simultanées ne passent pas toutes sous la limite.
create or replace function public.rdv_book(
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
  perform 1 from public.rdv_settings s where s.owner_id = v_owner for update;
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

-- 4. Réglages et horaires enregistrés d'un seul bloc (une transaction, verrou par propriétaire) : deux
-- sauvegardes simultanées ne peuvent plus mélanger leurs horaires.
create function public.rdv_save_settings(p_enabled boolean, p_durations smallint[], p_hours jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := (select auth.uid());
begin
  if v_owner is null or jsonb_typeof(p_hours) <> 'array' or jsonb_array_length(p_hours) > 70 then
    raise exception 'rdv_invalid' using errcode = 'P0001';
  end if;
  insert into public.rdv_settings (owner_id, enabled, durations)
  values (v_owner, p_enabled, p_durations)
  on conflict (owner_id) do update set enabled = excluded.enabled, durations = excluded.durations;
  perform 1 from public.rdv_settings s where s.owner_id = v_owner for update;
  delete from public.rdv_hours where owner_id = v_owner;
  insert into public.rdv_hours (owner_id, weekday, start_time, end_time)
  select v_owner, (h ->> 'weekday')::smallint, (h ->> 'start')::time, (h ->> 'end')::time
  from jsonb_array_elements(p_hours) h;
exception
  when check_violation or unique_violation or invalid_text_representation or invalid_datetime_format
    or datetime_field_overflow or not_null_violation then
    raise exception 'rdv_invalid' using errcode = 'P0001';
end;
$$;

revoke execute on function public.rdv_save_settings(boolean, smallint[], jsonb) from public, anon;
grant execute on function public.rdv_save_settings(boolean, smallint[], jsonb) to authenticated;
