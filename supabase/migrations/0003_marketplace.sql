-- Marketplace de factions : modèles partagés (sans progression), pseudos publics, likes et signalements
-- Les limites de longueur doivent rester alignées avec src/utils/marketplace.ts (MARKETPLACE_LIMITS)

-- ─── Pseudo public ───────────────────────────────────────────────────────────
-- Affiché à la place de l'email sur les factions publiées
create table if not exists public.public_profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  pseudo text not null check (pseudo ~ '^[[:alnum:]_.-]{3,20}$'),
  created_at timestamptz not null default now()
);

create unique index if not exists public_profiles_pseudo_key on public.public_profiles (lower(pseudo));

alter table public.public_profiles enable row level security;

create policy "public_profiles_select_all" on public.public_profiles
  for select to anon, authenticated using (true);

create policy "public_profiles_insert_own" on public.public_profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "public_profiles_update_own" on public.public_profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Supabase donne tous les droits par défaut : on repart de zéro, colonne par colonne
revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;
grant insert (pseudo), update (pseudo) on public.public_profiles to authenticated;

-- ─── Factions publiées ───────────────────────────────────────────────────────
-- Thèmes autorisés (identifiants traduits côté app)
create or replace function public.marketplace_valid_tags(tags text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_length(tags, 1), 0) between 1 and 3
    and tags <@ array['health', 'sport', 'mind', 'learning', 'work', 'creativity', 'finance', 'social', 'home', 'leisure']::text[]
$$;

-- Quêtes du modèle : 1 à 50, titre 1-80 caractères, description ≤ 300, aucune donnée de progression
create or replace function public.marketplace_valid_quests(quests jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(quests) = 'array'
    and jsonb_array_length(quests) between 1 and 50
    and not exists (
      select 1
      from jsonb_array_elements(quests) q
      where jsonb_typeof(q) <> 'object'
        or char_length(coalesce(q ->> 'title', '')) not between 1 and 80
        or char_length(coalesce(q ->> 'description', '')) > 300
        or (q ->> 'type') is null
        or (q ->> 'type') not in ('daily', 'weekly', 'monthly', 'yearly')
        or q ? 'completed' or q ? 'current' or q ? 'streakCount'
    )
$$;

create table if not exists public.shared_factions (
  id uuid primary key default gen_random_uuid(),
  -- Publier demande un pseudo public (et la clé permet de joindre le pseudo de l'auteur)
  author_id uuid not null default auth.uid() references public.public_profiles (user_id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  description text not null default '' check (char_length(description) <= 280),
  tags text[] not null check (public.marketplace_valid_tags(tags)),
  icon text not null default '' check (char_length(icon) <= 16),
  image text check (image is null or (image like 'data:image/%' and octet_length(image) <= 100000)),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  quests jsonb not null check (public.marketplace_valid_quests(quests)),
  likes_count integer not null default 0,
  reports_count integer not null default 0,
  -- Masquée par la modération (automatiquement à 3 signalements, ou à la main dans le dashboard)
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists shared_factions_popular_idx on public.shared_factions (likes_count desc, created_at desc) where not hidden;
create index if not exists shared_factions_recent_idx on public.shared_factions (created_at desc) where not hidden;
create index if not exists shared_factions_author_idx on public.shared_factions (author_id);

alter table public.shared_factions enable row level security;

-- Tout le monde voit les factions visibles ; l'auteur voit aussi les siennes masquées
create policy "shared_factions_select_visible" on public.shared_factions
  for select to anon, authenticated
  using (not hidden or (select auth.uid()) = author_id);

create policy "shared_factions_insert_own" on public.shared_factions
  for insert to authenticated with check ((select auth.uid()) = author_id);

-- Dépublier = supprimer sa propre publication
create policy "shared_factions_delete_own" on public.shared_factions
  for delete to authenticated using ((select auth.uid()) = author_id);

revoke all on public.shared_factions from anon, authenticated;
grant select on public.shared_factions to anon, authenticated;
-- Compteurs et statut de modération jamais écrits par le client
grant insert (name, description, tags, icon, image, color, quests) on public.shared_factions to authenticated;
grant delete on public.shared_factions to authenticated;

-- Anti-spam : 20 publications maximum par compte
create or replace function public.shared_factions_limit_per_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.shared_factions where author_id = new.author_id) >= 20 then
    raise exception 'marketplace_quota' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger shared_factions_limit_per_author
  before insert on public.shared_factions
  for each row execute function public.shared_factions_limit_per_author();

-- ─── Likes ───────────────────────────────────────────────────────────────────
create table if not exists public.faction_likes (
  faction_id uuid not null references public.shared_factions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (faction_id, user_id)
);

create index if not exists faction_likes_user_idx on public.faction_likes (user_id);

alter table public.faction_likes enable row level security;

create policy "faction_likes_select_own" on public.faction_likes
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "faction_likes_insert_own" on public.faction_likes
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "faction_likes_delete_own" on public.faction_likes
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.faction_likes from anon, authenticated;
grant select, delete on public.faction_likes to authenticated;
grant insert (faction_id) on public.faction_likes to authenticated;

create or replace function public.faction_likes_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.shared_factions set likes_count = likes_count + 1 where id = new.faction_id;
  else
    update public.shared_factions set likes_count = greatest(likes_count - 1, 0) where id = old.faction_id;
  end if;
  return null;
end;
$$;

create trigger faction_likes_count
  after insert or delete on public.faction_likes
  for each row execute function public.faction_likes_count();

-- ─── Signalements ────────────────────────────────────────────────────────────
create table if not exists public.faction_reports (
  faction_id uuid not null references public.shared_factions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 500),
  created_at timestamptz not null default now(),
  primary key (faction_id, user_id)
);

alter table public.faction_reports enable row level security;

-- Un compte ne voit que ses propres signalements (pour savoir s'il a déjà signalé)
create policy "faction_reports_select_own" on public.faction_reports
  for select to authenticated using ((select auth.uid()) = user_id);

-- On ne peut pas signaler sa propre faction
create policy "faction_reports_insert_own" on public.faction_reports
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and not exists (
      select 1 from public.shared_factions f
      where f.id = faction_id and f.author_id = (select auth.uid())
    )
  );

revoke all on public.faction_reports from anon, authenticated;
grant select on public.faction_reports to authenticated;
grant insert (faction_id, reason) on public.faction_reports to authenticated;

-- Compte les signalements et masque la faction à partir de 3
create or replace function public.faction_reports_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.shared_factions
  set reports_count = reports_count + 1,
      hidden = hidden or reports_count + 1 >= 3
  where id = new.faction_id;
  return null;
end;
$$;

create trigger faction_reports_count
  after insert on public.faction_reports
  for each row execute function public.faction_reports_count();

-- Les fonctions de trigger ne sont pas appelables directement via l'API
revoke execute on function public.shared_factions_limit_per_author() from public, anon, authenticated;
revoke execute on function public.faction_likes_count() from public, anon, authenticated;
revoke execute on function public.faction_reports_count() from public, anon, authenticated;
