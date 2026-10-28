import { supabase } from './supabase';
import { FactionTemplate, MarketplaceTag, SharedFaction, sanitizeSearch } from '../utils/marketplace';

export type MarketplaceSort = 'popular' | 'recent';

export interface MarketplaceQuery {
  search: string;
  tag: MarketplaceTag | null;
  sort: MarketplaceSort;
  mine?: string | null; // id du compte : uniquement ses publications
  page: number;
}

export const MARKETPLACE_PAGE_SIZE = 24;

// Erreurs remontées à l'interface (traduites dans marketplace.error.*)
export type MarketplaceErrorCode = 'offline' | 'pseudoTaken' | 'quota' | 'invalid' | 'unknown';

export class MarketplaceError extends Error {
  constructor(public code: MarketplaceErrorCode) {
    super(code);
  }
}

function fail(error: { code?: string; message?: string } | null): never {
  const message = error?.message ?? '';
  if (error?.code === '23505') throw new MarketplaceError('pseudoTaken');
  if (message.includes('marketplace_quota')) throw new MarketplaceError('quota');
  if (error?.code === '23514' || error?.code === '23503') throw new MarketplaceError('invalid');
  if (/fetch|network/i.test(message)) throw new MarketplaceError('offline');
  throw new MarketplaceError('unknown');
}

function client() {
  if (!supabase) throw new MarketplaceError('offline');
  return supabase;
}

interface SharedFactionRow {
  id: string;
  author_id: string;
  name: string;
  description: string;
  tags: MarketplaceTag[];
  icon: string;
  image: string | null;
  color: string;
  quests: FactionTemplate['quests'];
  likes_count: number;
  hidden: boolean;
  created_at: string;
  author: { pseudo: string } | null;
}

const COLUMNS =
  'id, author_id, name, description, tags, icon, image, color, quests, likes_count, hidden, created_at, author:public_profiles(pseudo)';

const fromRow = (row: SharedFactionRow): SharedFaction => ({
  id: row.id,
  authorId: row.author_id,
  authorPseudo: row.author?.pseudo ?? '?',
  name: row.name,
  description: row.description,
  tags: row.tags,
  icon: row.icon,
  image: row.image,
  color: row.color,
  quests: row.quests,
  likesCount: row.likes_count,
  hidden: row.hidden,
  createdAt: row.created_at,
});

export async function fetchSharedFactions(query: MarketplaceQuery): Promise<{ items: SharedFaction[]; hasMore: boolean }> {
  let request = client().from('shared_factions').select(COLUMNS);

  const search = sanitizeSearch(query.search);
  if (search) request = request.or(`name.ilike.*${search}*,description.ilike.*${search}*`);
  if (query.tag) request = request.contains('tags', [query.tag]);
  if (query.mine) request = request.eq('author_id', query.mine);
  else request = request.eq('hidden', false);

  if (query.sort === 'popular') request = request.order('likes_count', { ascending: false });
  request = request.order('created_at', { ascending: false });

  // Une ligne de plus que la page pour savoir s'il en reste
  const from = query.page * MARKETPLACE_PAGE_SIZE;
  const { data, error } = await request.range(from, from + MARKETPLACE_PAGE_SIZE);
  if (error) fail(error);
  const rows = (data ?? []) as unknown as SharedFactionRow[];
  return { items: rows.slice(0, MARKETPLACE_PAGE_SIZE).map(fromRow), hasMore: rows.length > MARKETPLACE_PAGE_SIZE };
}

// Factions déjà aimées / signalées par le compte, parmi celles affichées
export async function fetchMyReactions(ids: string[]): Promise<{ liked: Set<string>; reported: Set<string> }> {
  if (ids.length === 0) return { liked: new Set(), reported: new Set() };
  const db = client();
  const [likes, reports] = await Promise.all([
    db.from('faction_likes').select('faction_id').in('faction_id', ids),
    db.from('faction_reports').select('faction_id').in('faction_id', ids),
  ]);
  if (likes.error) fail(likes.error);
  if (reports.error) fail(reports.error);
  return {
    liked: new Set((likes.data ?? []).map(r => r.faction_id as string)),
    reported: new Set((reports.data ?? []).map(r => r.faction_id as string)),
  };
}

export async function fetchMyPseudo(userId: string): Promise<string | null> {
  const { data, error } = await client().from('public_profiles').select('pseudo').eq('user_id', userId).maybeSingle();
  if (error) fail(error);
  return (data?.pseudo as string | undefined) ?? null;
}

export async function saveMyPseudo(userId: string, pseudo: string, exists: boolean): Promise<void> {
  const db = client().from('public_profiles');
  const { error } = exists ? await db.update({ pseudo }).eq('user_id', userId) : await db.insert({ pseudo });
  if (error) fail(error);
}

export async function publishFaction(template: FactionTemplate): Promise<void> {
  const { error } = await client().from('shared_factions').insert({
    name: template.name.trim(),
    description: template.description,
    tags: template.tags,
    icon: template.icon,
    image: template.image,
    color: template.color,
    quests: template.quests,
  });
  if (error) fail(error);
}

export async function unpublishFaction(id: string): Promise<void> {
  const { error } = await client().from('shared_factions').delete().eq('id', id);
  if (error) fail(error);
}

export async function setLike(id: string, liked: boolean): Promise<void> {
  const db = client().from('faction_likes');
  const { error } = liked ? await db.insert({ faction_id: id }) : await db.delete().eq('faction_id', id);
  // Déjà aimée (double clic, autre appareil) : l'état voulu est atteint
  if (error && error.code !== '23505') fail(error);
}

export async function reportFaction(id: string, reason: string): Promise<void> {
  const { error } = await client().from('faction_reports').insert({ faction_id: id, reason });
  if (error && error.code !== '23505') fail(error);
}
