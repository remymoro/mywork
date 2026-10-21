-- Offre freelance : disponibilité en 4 choix (maquette du porteur, 2026-10-21).
-- « a_partir_du » utilise freelance_available_from. freelance_days_per_week n'est plus saisi.
alter table public.profiles
  add column freelance_availability text not null default 'non_precisee'
    check (freelance_availability in ('non_precisee', 'disponible', 'a_partir_du', 'indisponible'));

-- Les offres déjà saisies : une date future devient « à partir du », sinon « disponible ».
update public.profiles
set freelance_availability = case
  when freelance_available_from > current_date then 'a_partir_du'
  else 'disponible'
end
where freelance_enabled;
