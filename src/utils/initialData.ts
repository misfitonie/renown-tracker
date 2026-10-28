import { Faction, Quest, GameState, QuestType, CompletionType } from '../types';
import { instantiateTemplate, SharedQuest } from './marketplace';

type Lang = 'fr' | 'en';
type Text = Record<Lang, string>;

interface StarterQuest {
  title: Text;
  description: Text;
  type: QuestType;
  completionType?: CompletionType;
  target?: number;
  linkedToWeekly?: boolean; // incrémente la quête hebdo (progress) de la faction
}

export interface StarterFaction {
  id: string;
  name: Text;
  icon: string;
  color: string;
  quests: StarterQuest[];
}

const REWARDS: Record<QuestType, { xpReward: number; currencyReward: number }> = {
  daily: { xpReward: 50, currencyReward: 10 },
  weekly: { xpReward: 200, currencyReward: 50 },
  monthly: { xpReward: 500, currencyReward: 120 },
  yearly: { xpReward: 2000, currencyReward: 500 },
};

/**
 * Factions proposées à la création du personnage
 */
export const STARTER_FACTIONS: StarterFaction[] = [
  {
    id: 'sport',
    name: { fr: 'Sport', en: 'Sport' },
    icon: '💪',
    color: '#2ecc71',
    quests: [
      { title: { fr: "Séance d'entraînement", en: 'Workout session' }, description: { fr: 'Muscu, course, vélo… une vraie séance', en: 'Gym, running, cycling… a real session' }, type: 'daily', linkedToWeekly: true },
      { title: { fr: 'Marcher 8 000 pas', en: 'Walk 8,000 steps' }, description: { fr: '', en: '' }, type: 'daily' },
      { title: { fr: '3 séances de sport', en: '3 workouts' }, description: { fr: "Entraîne-toi au moins 3 fois cette semaine", en: 'Work out at least 3 times this week' }, type: 'weekly', completionType: 'progress', target: 3 },
    ],
  },
  {
    id: 'work',
    name: { fr: 'Travail', en: 'Work' },
    icon: '💼',
    color: '#4a9eff',
    quests: [
      { title: { fr: 'Bloc de travail concentré', en: 'Deep work block' }, description: { fr: '90 minutes sans distraction', en: '90 minutes without distractions' }, type: 'daily' },
      { title: { fr: 'Vider sa boîte de réception', en: 'Inbox zero' }, description: { fr: '', en: '' }, type: 'daily' },
      { title: { fr: 'Planifier la semaine', en: 'Plan the week' }, description: { fr: 'Fixe tes 3 priorités de la semaine', en: 'Set your top 3 priorities for the week' }, type: 'weekly' },
    ],
  },
  {
    id: 'learning',
    name: { fr: 'Culture', en: 'Learning' },
    icon: '📚',
    color: '#9d4edd',
    quests: [
      { title: { fr: 'Lire 30 minutes', en: 'Read for 30 minutes' }, description: { fr: 'Un livre, un article ou une doc technique', en: 'A book, an article or technical docs' }, type: 'daily' },
      { title: { fr: 'Apprendre quelque chose', en: 'Learn something' }, description: { fr: 'Tutoriel, cours, vidéo éducative…', en: 'Tutorial, course, educational video…' }, type: 'daily' },
      { title: { fr: 'Finir un livre ou un cours', en: 'Finish a book or a course' }, description: { fr: '', en: '' }, type: 'monthly' },
    ],
  },
  {
    id: 'health',
    name: { fr: 'Santé', en: 'Health' },
    icon: '🍎',
    color: '#e74c3c',
    quests: [
      { title: { fr: 'Boire 1,5 L d\'eau', en: 'Drink 1.5 L of water' }, description: { fr: '', en: '' }, type: 'daily' },
      { title: { fr: 'Dormir 7 h', en: 'Sleep 7 hours' }, description: { fr: '', en: '' }, type: 'daily' },
      { title: { fr: 'Cuisiner maison 4 fois', en: 'Cook at home 4 times' }, description: { fr: '', en: '' }, type: 'weekly', completionType: 'progress', target: 4 },
    ],
  },
  {
    id: 'mind',
    name: { fr: 'Bien-être', en: 'Well-being' },
    icon: '🧘',
    color: '#1abc9c',
    quests: [
      { title: { fr: 'Méditer 10 minutes', en: 'Meditate for 10 minutes' }, description: { fr: '', en: '' }, type: 'daily' },
      { title: { fr: 'Journal de gratitude', en: 'Gratitude journal' }, description: { fr: 'Note 3 choses positives de la journée', en: 'Write down 3 good things about your day' }, type: 'daily' },
      { title: { fr: 'Une soirée sans écran', en: 'A screen-free evening' }, description: { fr: '', en: '' }, type: 'weekly' },
    ],
  },
  {
    id: 'finance',
    name: { fr: 'Finances', en: 'Finance' },
    icon: '💰',
    color: '#d4af37',
    quests: [
      { title: { fr: 'Noter ses dépenses', en: 'Log your expenses' }, description: { fr: '', en: '' }, type: 'daily' },
      { title: { fr: 'Revoir son budget', en: 'Review your budget' }, description: { fr: '', en: '' }, type: 'weekly' },
      { title: { fr: 'Mettre de côté', en: 'Put money aside' }, description: { fr: 'Virement vers ton épargne', en: 'Transfer to your savings' }, type: 'monthly' },
    ],
  },
  {
    id: 'social',
    name: { fr: 'Relations', en: 'Relationships' },
    icon: '🤝',
    color: '#ff6b9d',
    quests: [
      { title: { fr: 'Prendre des nouvelles d\'un proche', en: 'Check in with someone close' }, description: { fr: '', en: '' }, type: 'daily' },
      { title: { fr: 'Voir des amis ou de la famille', en: 'See friends or family' }, description: { fr: '', en: '' }, type: 'weekly' },
      { title: { fr: 'Organiser une sortie', en: 'Plan an outing' }, description: { fr: '', en: '' }, type: 'monthly' },
    ],
  },
  {
    id: 'home',
    name: { fr: 'Maison', en: 'Home' },
    icon: '🏠',
    color: '#ff9f43',
    quests: [
      { title: { fr: 'Ranger 15 minutes', en: 'Tidy up for 15 minutes' }, description: { fr: '', en: '' }, type: 'daily' },
      { title: { fr: 'Faire le ménage', en: 'Clean the house' }, description: { fr: '', en: '' }, type: 'weekly' },
      { title: { fr: 'Faire les courses', en: 'Do the groceries' }, description: { fr: '', en: '' }, type: 'weekly' },
    ],
  },
  {
    id: 'creativity',
    name: { fr: 'Créativité', en: 'Creativity' },
    icon: '🎨',
    color: '#a29bfe',
    quests: [
      { title: { fr: 'Créer 20 minutes', en: 'Create for 20 minutes' }, description: { fr: 'Dessin, musique, écriture…', en: 'Drawing, music, writing…' }, type: 'daily' },
      { title: { fr: 'Partager une création', en: 'Share a creation' }, description: { fr: '', en: '' }, type: 'weekly' },
      { title: { fr: 'Terminer un projet', en: 'Finish a project' }, description: { fr: '', en: '' }, type: 'monthly' },
    ],
  },
];

// Sélection par défaut (et pour le reset)
export const DEFAULT_STARTER_IDS = ['sport', 'work', 'learning'];

// Instancie les factions de départ choisies, dans la langue de l'interface
export function buildStarterContent(ids: string[], lang: string = 'fr', now = Date.now()): { factions: Faction[]; quests: Quest[] } {
  const l: Lang = lang.startsWith('en') ? 'en' : 'fr';
  const factions: Faction[] = [];
  const quests: Quest[] = [];

  STARTER_FACTIONS.filter(s => ids.includes(s.id)).forEach((starter, index) => {
    const weeklyIndex = starter.quests.findIndex(q => q.type === 'weekly' && q.completionType === 'progress');
    const shared: SharedQuest[] = starter.quests.map((q, i) => ({
      key: `q${i}`,
      title: q.title[l],
      description: q.description[l],
      type: q.type,
      completionType: q.completionType ?? 'boolean',
      ...REWARDS[q.type],
      target: q.target,
      startingValue: q.completionType === 'progress' ? 0 : undefined,
      linkedWeeklyKey: q.linkedToWeekly && weeklyIndex !== -1 ? `q${weeklyIndex}` : undefined,
    }));
    const result = instantiateTemplate(
      { name: starter.name[l], icon: starter.icon, image: null, color: starter.color, quests: shared },
      now + index
    );
    factions.push(result.faction);
    quests.push(...result.quests);
  });

  return { factions, quests };
}

/**
 * État initial du jeu
 */
export function getInitialGameState(starterIds: string[] = DEFAULT_STARTER_IDS, lang?: string): GameState {
  const now = new Date().toISOString();
  return {
    ...buildStarterContent(starterIds, lang),
    currency: 0,
    playerXP: 0,
    playerLevel: 0,
    lastDailyReset: now,
    lastWeeklyReset: now,
    lastMonthlyReset: now,
    lastYearlyReset: now,
  };
}
