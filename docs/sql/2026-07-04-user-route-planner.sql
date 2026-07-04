-- Adiciona campos de planner pessoal nas paradas de roteiros do usuário.
-- Rode este SQL no editor SQL do Supabase antes de usar a nova UI.

alter table public.user_route_stops
  add column if not exists personal_note text,
  add column if not exists planned_day smallint,
  add column if not exists priority text
    check (priority in ('low','medium','high'))
    default 'medium';

-- Grants defensivos (não altera RLS existente)
grant select, insert, update, delete on public.user_route_stops to authenticated;
grant all on public.user_route_stops to service_role;
