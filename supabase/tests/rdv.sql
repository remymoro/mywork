-- Test de la migration Rendez-vous (rejouable, annulé à la fin : ne laisse rien dans la base).
-- Lancer : cat supabase/migrations/20261022200000_rdv.sql supabase/tests/rdv.sql > /tmp/rdv-run.sql && pnpm exec supabase db query --linked -f /tmp/rdv-run.sql
-- Résultat attendu : une « erreur » P0001 RESULTATS dont toutes les lignes commencent par « ok ».

create function pg_temp.expect_err(q text, expected text) returns text language plpgsql as $f$
begin
  execute q;
  return 'ECHEC (aucune erreur) : ' || expected;
exception when others then
  if sqlerrm = expected then return 'ok ' || expected; end if;
  return 'ECHEC (' || sqlerrm || ') attendu ' || expected;
end $f$;

do $t$
declare
  uid uuid := gen_random_uuid();
  uid2 uuid := gen_random_uuid();
  res text[] := '{}';
  d date := (now() at time zone 'Europe/Paris')::date + 7;
  s timestamptz;
  r jsonb;
  tok uuid;
  aid uuid;
begin
  while extract(isodow from d) <> 2 loop d := d + 1; end loop;   -- un mardi dans 7 à 13 jours
  insert into auth.users (id, email) values (uid, 'owner@example.com'), (uid2, 'autre@example.com');
  insert into public.profiles (id, username, display_name, contact_email) values (uid, 'rdvtest1', 'Test Rdv', 'owner@example.com');
  insert into public.profiles (id, username, display_name) values (uid2, 'rdvtest2', 'Autre');
  insert into public.rdv_settings (owner_id, enabled, durations) values (uid, true, '{30,60}');
  insert into public.rdv_hours (owner_id, weekday, start_time, end_time)
    select uid, w, t.a, t.b from generate_series(1,5) w, (values (time '09:00', time '12:00'), (time '14:00', time '18:00')) t(a,b);

  -- config publique
  r := public.rdv_public_config('rdvtest1');
  res := res || (case when r->'durations' = '[30, 60]'::jsonb and jsonb_array_length(r->'hours') = 10 then 'ok config' else 'ECHEC config ' || r::text end);
  res := res || (case when public.rdv_public_config('rdvtest2') is null then 'ok config nulle si non activé' else 'ECHEC config non activé' end);

  -- réservation valide mardi 10:00 (heure de Paris), 30 min
  s := (d + time '10:00') at time zone 'Europe/Paris';
  r := public.rdv_book('rdvtest1', s, 30::smallint, 'Camille', 'Laurent', ' Camille@Exemple.fr ', 'Bonjour');
  tok := (r->>'token')::uuid; aid := (r->>'id')::uuid;
  res := res || (case when r->>'guest_email' = 'camille@exemple.fr' and r->>'owner_email' = 'owner@example.com' then 'ok réservation' else 'ECHEC réservation ' || r::text end);
  res := res || (case when jsonb_array_length(public.rdv_public_config('rdvtest1')->'busy') = 1 then 'ok créneau occupé visible' else 'ECHEC busy' end);
  res := res || (case when (public.rdv_public_config('rdvtest1')::text) not like '%camille%' then 'ok aucune donnée perso publique' else 'ECHEC fuite donnée perso' end);

  res := res || pg_temp.expect_err(format($q$select public.rdv_book('rdvtest1', %L, 30::smallint, 'A','B','a@b.fr','')$q$, s), 'rdv_slot_taken');
  res := res || pg_temp.expect_err(format($q$select public.rdv_book('rdvtest1', %L, 60::smallint, 'A','B','a@b.fr','')$q$, s + interval '30 minutes' - interval '30 minutes' + interval '0'), 'rdv_slot_taken');
  res := res || pg_temp.expect_err(format($q$select public.rdv_book('rdvtest1', %L, 30::smallint, 'A','B','a@b.fr','')$q$, s + interval '15 minutes'), 'rdv_slot_taken');
  res := res || pg_temp.expect_err(format($q$select public.rdv_book('rdvtest1', %L, 30::smallint, 'A','B','a@b.fr','')$q$, (d + time '12:00') at time zone 'Europe/Paris'), 'rdv_invalid');
  res := res || pg_temp.expect_err(format($q$select public.rdv_book('rdvtest1', %L, 60::smallint, 'A','B','a@b.fr','')$q$, (d + time '11:30') at time zone 'Europe/Paris'), 'rdv_invalid');
  res := res || pg_temp.expect_err(format($q$select public.rdv_book('rdvtest1', %L, 30::smallint, 'A','B','a@b.fr','')$q$, (d + 4 + time '10:00') at time zone 'Europe/Paris'), 'rdv_invalid');
  res := res || pg_temp.expect_err(format($q$select public.rdv_book('rdvtest1', %L, 15::smallint, 'A','B','a@b.fr','')$q$, (d + time '15:00') at time zone 'Europe/Paris'), 'rdv_invalid');
  res := res || pg_temp.expect_err(format($q$select public.rdv_book('rdvtest1', %L, 30::smallint, 'A','B','a@b.fr','')$q$, now() + interval '1 hour'), 'rdv_invalid');
  res := res || pg_temp.expect_err(format($q$select public.rdv_book('rdvtest1', %L, 30::smallint, 'A','B','a@b.fr','')$q$, now() + interval '3 months'), 'rdv_invalid');
  res := res || pg_temp.expect_err(format($q$select public.rdv_book('rdvtest1', %L, 30::smallint, 'A','B','a@b.fr','')$q$, (d + time '10:07') at time zone 'Europe/Paris'), 'rdv_invalid');
  res := res || pg_temp.expect_err(format($q$select public.rdv_book('rdvtest2', %L, 30::smallint, 'A','B','a@b.fr','')$q$, (d + time '15:00') at time zone 'Europe/Paris'), 'rdv_invalid');
  res := res || pg_temp.expect_err(format($q$select public.rdv_book('rdvtest1', %L, 30::smallint, '','B','a@b.fr','')$q$, (d + time '15:00') at time zone 'Europe/Paris'), 'rdv_invalid');

  -- exceptions : jour fermé / horaires particuliers
  insert into public.rdv_exceptions (owner_id, day) values (uid, d + 1);
  insert into public.rdv_exceptions (owner_id, day, start_time, end_time) values (uid, d + 2, '16:00', '17:00');
  res := res || pg_temp.expect_err(format($q$select public.rdv_book('rdvtest1', %L, 30::smallint, 'A','B','a@b.fr','')$q$, (d + 1 + time '10:00') at time zone 'Europe/Paris'), 'rdv_invalid');
  res := res || pg_temp.expect_err(format($q$select public.rdv_book('rdvtest1', %L, 30::smallint, 'A','B','a@b.fr','')$q$, (d + 2 + time '10:00') at time zone 'Europe/Paris'), 'rdv_invalid');
  perform public.rdv_book('rdvtest1', (d + 2 + time '16:30') at time zone 'Europe/Paris', 30::smallint, 'A','B','x@y.fr','');
  res := res || 'ok exception horaires particuliers'::text;

  -- annulation par le visiteur, puis le créneau se libère
  r := public.rdv_cancel(tok);
  res := res || (case when r->>'status' = 'cancelled' then 'ok annulation' else 'ECHEC annulation' end);
  res := res || pg_temp.expect_err(format($q$select public.rdv_cancel(%L)$q$, tok), 'rdv_invalid');
  r := public.rdv_book('rdvtest1', s, 30::smallint, 'Camille', 'Laurent', 'camille@exemple.fr', '');
  tok := (r->>'token')::uuid; aid := (r->>'id')::uuid;
  res := res || 'ok créneau libéré rebloqué'::text;

  -- report
  r := public.rdv_reschedule(tok, (d + time '14:00') at time zone 'Europe/Paris');
  res := res || (case when (r->'after'->>'starts_at')::timestamptz = (d + time '14:00') at time zone 'Europe/Paris'
                        and (r->'before'->>'starts_at')::timestamptz = s then 'ok report' else 'ECHEC report ' || r::text end);
  perform public.rdv_book('rdvtest1', s, 30::smallint, 'Zoé', 'Martin', 'zoe@exemple.fr', '');
  res := res || 'ok ancien créneau libéré après report'::text;
  res := res || pg_temp.expect_err(format($q$select public.rdv_reschedule(%L, %L)$q$, tok, s), 'rdv_slot_taken');

  -- limite : 3 rendez-vous à venir par e-mail (camille en a déjà 1 : 14:00)
  perform public.rdv_book('rdvtest1', (d + time '14:30') at time zone 'Europe/Paris', 30::smallint, 'C', 'L', 'camille@exemple.fr', '');
  perform public.rdv_book('rdvtest1', (d + time '15:00') at time zone 'Europe/Paris', 30::smallint, 'C', 'L', 'camille@exemple.fr', '');
  res := res || pg_temp.expect_err(format($q$select public.rdv_book('rdvtest1', %L, 30::smallint, 'C','L','camille@exemple.fr','')$q$, (d + time '15:30') at time zone 'Europe/Paris'), 'rdv_limit');

  -- côté propriétaire (auth.uid() simulé)
  perform set_config('request.jwt.claim.sub', uid2::text, true);
  res := res || pg_temp.expect_err(format($q$select public.rdv_owner_cancel(%L)$q$, aid), 'rdv_invalid');
  perform set_config('request.jwt.claim.sub', uid::text, true);
  r := public.rdv_owner_cancel(aid);
  res := res || (case when r->>'status' = 'cancelled' then 'ok annulation propriétaire' else 'ECHEC annulation propriétaire' end);

  raise exception E'RESULTATS\n%', array_to_string(res, E'\n');
end $t$;
