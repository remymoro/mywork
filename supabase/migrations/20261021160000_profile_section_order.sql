-- Ordre des sections de la page publique, choisi par glisser-déposer dans « Mon profil ».
-- Vide = ordre par défaut ; les sections absentes de la liste s'ajoutent à la fin.
alter table public.profiles
  add column section_order text[] not null default '{}' check (cardinality(section_order) <= 20);
