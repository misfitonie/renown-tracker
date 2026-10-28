import { CompletionType, Faction, Quest, QuestType } from '../types';
import { getXPForNextLevel } from './gameLogic';

// Limites partagées avec la base (supabase/migrations/0003_marketplace.sql) : à garder alignées
export const MARKETPLACE_LIMITS = {
  pseudoMin: 3,
  pseudoMax: 20,
  factionName: 40,
  icon: 16,
  description: 280,
  questTitle: 80,
  questDescription: 300,
  maxQuests: 50,
  maxTags: 3,
  reportReason: 500,
  imageBytes: 100_000,
} as const;

export const MARKETPLACE_TAGS = [
  'health',
  'sport',
  'mind',
  'learning',
  'work',
  'creativity',
  'finance',
  'social',
  'home',
  'leisure',
] as const;
export type MarketplaceTag = (typeof MARKETPLACE_TAGS)[number];

export const PSEUDO_PATTERN = /^[\p{L}\p{N}_.-]{3,20}$/u;

// Une quête du modèle : sa définition seulement, sans état (validée, compteur, streak)
export interface SharedQuest {
  key: string; // identifiant local au modèle, sert aux liens journalière → hebdo
  title: string;
  description: string;
  type: QuestType;
  completionType: CompletionType;
  xpReward: number;
  currencyReward: number;
  target?: number;
  startingValue?: number;
  followStreak?: boolean;
  linkedWeeklyKey?: string;
}

// Ce qui est publié : l'apparence de la faction et ses quêtes, sans niveau ni XP
export interface FactionTemplate {
  name: string;
  description: string;
  tags: MarketplaceTag[];
  icon: string;
  image: string | null;
  color: string;
  quests: SharedQuest[];
}

// Une faction de la marketplace telle que lue depuis Supabase
export interface SharedFaction extends FactionTemplate {
  id: string;
  authorId: string;
  authorPseudo: string;
  likesCount: number;
  hidden: boolean;
  createdAt: string;
}

export type TemplateError = 'name' | 'description' | 'tags' | 'noQuests' | 'tooManyQuests' | 'questTitle' | 'image';

const clip = (text: string, max: number) => Array.from(text.trim()).slice(0, max).join('');
const length = (text: string) => Array.from(text).length;

// Construit le modèle publiable d'une faction : seule la structure part, jamais la progression
export function toFactionTemplate(
  faction: Faction,
  quests: Quest[],
  meta: { description: string; tags: MarketplaceTag[] }
): FactionTemplate {
  const own = quests.filter(q => q.factionId === faction.id);
  const keys = new Map(own.map((q, i) => [q.id, `q${i}`]));

  return {
    name: clip(faction.name, MARKETPLACE_LIMITS.factionName),
    description: clip(meta.description, MARKETPLACE_LIMITS.description),
    tags: meta.tags.slice(0, MARKETPLACE_LIMITS.maxTags),
    icon: clip(faction.icon, MARKETPLACE_LIMITS.icon),
    image: faction.image ?? null,
    color: faction.color,
    quests: own.map((q, i) => {
      const shared: SharedQuest = {
        key: `q${i}`,
        title: clip(q.title, MARKETPLACE_LIMITS.questTitle),
        description: clip(q.description ?? '', MARKETPLACE_LIMITS.questDescription),
        type: q.type,
        completionType: q.completionType,
        xpReward: q.xpReward,
        currencyReward: q.currencyReward,
      };
      if (q.completionType === 'progress') {
        shared.target = q.target;
        shared.startingValue = q.startingValue ?? 0;
      }
      if (q.followStreak) shared.followStreak = true;
      const linked = q.linkedWeeklyQuestId && keys.get(q.linkedWeeklyQuestId);
      if (linked) shared.linkedWeeklyKey = linked;
      return shared;
    }),
  };
}

// Vérifie un modèle avant publication (la base refait les mêmes contrôles)
export function validateTemplate(template: FactionTemplate): TemplateError | null {
  const name = template.name.trim();
  if (!name || length(name) > MARKETPLACE_LIMITS.factionName) return 'name';
  if (length(template.description) > MARKETPLACE_LIMITS.description) return 'description';
  if (template.tags.length === 0 || template.tags.length > MARKETPLACE_LIMITS.maxTags) return 'tags';
  if (template.quests.length === 0) return 'noQuests';
  if (template.quests.length > MARKETPLACE_LIMITS.maxQuests) return 'tooManyQuests';
  if (template.quests.some(q => !q.title.trim() || length(q.title) > MARKETPLACE_LIMITS.questTitle)) return 'questTitle';
  if (template.image && template.image.length > MARKETPLACE_LIMITS.imageBytes) return 'image';
  return null;
}

// Installe un modèle : nouvelle faction au niveau 0 et quêtes remises à zéro, avec de nouveaux IDs
export function instantiateTemplate(
  template: Pick<FactionTemplate, 'name' | 'icon' | 'image' | 'color' | 'quests'>,
  now = Date.now()
): { faction: Faction; quests: Quest[] } {
  const factionId = `faction-${now}`;
  const ids = new Map(template.quests.map((q, i) => [q.key, `quest-${now}-${i}`]));

  const faction: Faction = {
    id: factionId,
    name: template.name,
    icon: template.icon,
    image: template.image ?? undefined,
    color: template.color,
    renownLevel: 0,
    currentXP: 0,
    xpToNextLevel: getXPForNextLevel(0),
  };

  const quests: Quest[] = template.quests.map((q, i) => {
    const progress = q.completionType === 'progress';
    return {
      id: `quest-${now}-${i}`,
      title: q.title,
      description: q.description ?? '',
      factionId,
      type: q.type,
      completionType: q.completionType,
      xpReward: Math.max(0, Number(q.xpReward) || 0),
      currencyReward: Math.max(0, Number(q.currencyReward) || 0),
      completed: false,
      current: progress ? (q.startingValue ?? 0) : undefined,
      target: progress ? (q.target ?? 1) : undefined,
      startingValue: progress ? (q.startingValue ?? 0) : undefined,
      followStreak: !!q.followStreak,
      streakCount: 0,
      linkedWeeklyQuestId: q.linkedWeeklyKey ? ids.get(q.linkedWeeklyKey) : undefined,
    };
  });

  return { faction, quests };
}

// Nettoie la recherche pour le filtre PostgREST (les virgules et parenthèses y ont un sens)
export function sanitizeSearch(query: string): string {
  return query.replace(/[,()*%\\:"']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
}
