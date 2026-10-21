-- Kanban : « liste de fin » (une par tableau au plus). Y déposer une carte dont la checklist
-- n'est pas finie affiche un avertissement (docs/kanban.md, choix du porteur du 2026-10-21) ;
-- ce n'est pas un blocage, donc aucune règle de refus dans la base.
alter table public.kanban_lists add column is_done_list boolean not null default false;

create unique index kanban_lists_one_done_list_idx on public.kanban_lists (board_id) where is_done_list;
