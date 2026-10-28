-- Profils joueurs synchronisés : une ligne par profil, rattachée au compte
create table if not exists public.players (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Chaque compte ne voit et ne modifie que ses propres profils
alter table public.players enable row level security;

create policy "players_select_own" on public.players
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "players_insert_own" on public.players
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "players_update_own" on public.players
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "players_delete_own" on public.players
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.players to authenticated;
revoke all on public.players from anon;
