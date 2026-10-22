-- Essai du porteur (2026-10-22) : un report vers le créneau actuel était accepté (et envoyait un e-mail
-- « reporté » sans changement). Il est désormais refusé.
create or replace function public.rdv_do_reschedule(p_id uuid, p_new_start timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  a public.rdv_appointments;
  before jsonb;
begin
  select * into a from public.rdv_appointments where id = p_id and status = 'confirmed' and starts_at > now() for update;
  if not found or p_new_start = a.starts_at then raise exception 'rdv_invalid' using errcode = 'P0001'; end if;
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
