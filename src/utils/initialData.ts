import { Faction, Quest, GameState } from '../types';
import { getXPForNextLevel } from './gameLogic';

/**
 * Factions initiales
 */
export const INITIAL_FACTIONS: Faction[] = [
  {
    id: 'job',
    name: 'Job',
    icon: '💼',
    color: '#4a9eff',
    renownLevel: 0,
    currentXP: 0,
    xpToNextLevel: getXPForNextLevel(0),
  },
  {
    id: 'sport',
    name: 'Sport',
    icon: '💪',
    color: '#2ecc71',
    renownLevel: 0,
    currentXP: 0,
    xpToNextLevel: getXPForNextLevel(0),
  },
  {
    id: 'culture',
    name: 'Culture',
    icon: '📚',
    color: '#9d4edd',
    renownLevel: 0,
    currentXP: 0,
    xpToNextLevel: getXPForNextLevel(0),
  },
];

/**
 * Quêtes initiales par défaut
 */
export const INITIAL_QUESTS: Quest[] = [
  // Job - Dailies
  {
    id: 'job-daily-1',
    title: 'Envoyer une candidature',
    description: 'Postule à une offre d\'emploi',
    factionId: 'job',
    type: 'daily',
    xpReward: 50,
    currencyReward: 10,
    completionType: 'boolean',
    completed: false,
  },
  {
    id: 'job-daily-2',
    title: 'Améliorer ton CV',
    description: 'Travaille sur ton CV ou profil LinkedIn',
    factionId: 'job',
    type: 'daily',
    xpReward: 50,
    currencyReward: 10,
    completionType: 'boolean',
    completed: false,
  },
  // Job - Weekly
  {
    id: 'job-weekly-1',
    title: 'Envoyer 5 candidatures',
    description: 'Postule à au moins 5 offres cette semaine',
    factionId: 'job',
    type: 'weekly',
    xpReward: 200,
    currencyReward: 50,
    completionType: 'progress',
    completed: false,
    current: 0,
    target: 5,
  },

  // Sport - Dailies
  {
    id: 'sport-daily-1',
    title: 'Session de muscu',
    description: 'Complète une séance de musculation',
    factionId: 'sport',
    type: 'daily',
    xpReward: 50,
    currencyReward: 10,
    completionType: 'boolean',
    completed: false,
  },
  {
    id: 'sport-daily-2',
    title: 'Atteindre tes macros',
    description: 'Respecte ton plan nutritionnel',
    factionId: 'sport',
    type: 'daily',
    xpReward: 50,
    currencyReward: 10,
    completionType: 'boolean',
    completed: false,
  },
  // Sport - Weekly
  {
    id: 'sport-weekly-1',
    title: '3 sessions de sport',
    description: 'Entraîne-toi au moins 3 fois cette semaine',
    factionId: 'sport',
    type: 'weekly',
    xpReward: 200,
    currencyReward: 50,
    completionType: 'progress',
    completed: false,
    current: 0,
    target: 3,
  },

  // Culture - Dailies
  {
    id: 'culture-daily-1',
    title: 'Lire 30 minutes',
    description: 'Lis un livre, article ou doc technique',
    factionId: 'culture',
    type: 'daily',
    xpReward: 50,
    currencyReward: 10,
    completionType: 'boolean',
    completed: false,
  },
  {
    id: 'culture-daily-2',
    title: 'Apprendre quelque chose',
    description: 'Tutorial, cours, vidéo éducative...',
    factionId: 'culture',
    type: 'daily',
    xpReward: 50,
    currencyReward: 10,
    completionType: 'boolean',
    completed: false,
  },
  // Culture - Weekly
  {
    id: 'culture-weekly-1',
    title: 'Finir un livre ou un cours',
    description: 'Termine au moins une ressource d\'apprentissage',
    factionId: 'culture',
    type: 'weekly',
    xpReward: 200,
    currencyReward: 50,
    completionType: 'boolean',
    completed: false,
  },
];

/**
 * État initial du jeu
 */
export function getInitialGameState(): GameState {
  const now = new Date().toISOString();
  return {
    factions: INITIAL_FACTIONS,
    quests: INITIAL_QUESTS,
    currency: 0,
    playerXP: 0,
    playerLevel: 0,
    lastDailyReset: now,
    lastWeeklyReset: now,
    lastMonthlyReset: now,
    lastYearlyReset: now,
  };
}
