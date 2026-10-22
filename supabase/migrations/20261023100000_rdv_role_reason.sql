-- Rendez-vous : rôle du visiteur et motif, choisis dans une liste (décision du porteur, 2026-10-23).
-- Vides pour les rendez-vous pris avant ; obligatoires pour les nouvelles réservations (rdv_book).

alter table public.rdv_appointments
  add column guest_role text check (guest_role in ('recruiter', 'client', 'partner', 'other')),
  add column reason text check (reason in ('job', 'mission', 'advice', 'other'));

create or replace function public.rdv_describe(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', a.id, 'token', a.token, 'status', a.status,
    'starts_at', a.starts_at, 'ends_at', a.ends_at, 'duration_min', a.duration_min,
    'guest_first', a.guest_first, 'guest_last', a.guest_last, 'guest_email', a.guest_email, 'message', a.message,
    'guest_role', a.guest_role, 'reason', a.reason,
    'owner_username', p.username, 'owner_name', coalesce(p.display_name, p.username), 'owner_email', p.contact_email
  )
  from public.rdv_appointments a join public.profiles p on p.id = a.owner_id
  where a.id = p_id
$$;

-- Nouvelle signature : l'ancienne (sans rôle ni motif) disparaît.
drop function public.rdv_book(text, timestamptz, smallint, text, text, text, text);

create function public.rdv_book(
  p_username text, p_start timestamptz, p_duration smallint,
  p_first text, p_last text, p_email text, p_message text,
  p_role text, p_reason text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_id uuid;
  v_email text := lower(btrim(p_email));
begin
  if p_role is null or p_reason is null then raise exception 'rdv_invalid' using errcode = 'P0001'; end if;
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
    insert into public.rdv_appointments (owner_id, starts_at, ends_at, duration_min, guest_first, guest_last, guest_email, message, guest_role, reason)
    values (v_owner, p_start, p_start + p_duration * interval '1 minute', p_duration,
            btrim(p_first), btrim(p_last), v_email, btrim(coalesce(p_message, '')), p_role, p_reason)
    returning id into v_id;
  exception
    when exclusion_violation then raise exception 'rdv_slot_taken' using errcode = 'P0001';
    when check_violation then raise exception 'rdv_invalid' using errcode = 'P0001';
  end;
  return public.rdv_describe(v_id);
end;
$$;

revoke execute on function public.rdv_book(text, timestamptz, smallint, text, text, text, text, text, text) from public;
grant execute on function public.rdv_book(text, timestamptz, smallint, text, text, text, text, text, text) to anon, authenticated;
