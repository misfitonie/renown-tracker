// Types de base
export type QuestType = 'daily' | 'weekly';
export type CompletionType = 'boolean' | 'progress';
export type FactionId = 'job' | 'sport' | 'culture';

// Une quête individuelle
export interface Quest {
  id: string;
  title: string;
  description: string;
  factionId: FactionId;
  type: QuestType;
  xpReward: number;
  currencyReward: number;
  
  // Système de progression flexible
  completionType: CompletionType;
  completed: boolean;
  current?: number;  // si progress: ex 2
  target?: number;   // si progress: ex 5
}

// Une faction
export interface Faction {
  id: FactionId;
  name: string;
  icon: string;
  color: string;  // couleur pour le UI (hex)
  renownLevel: number;
  currentXP: number;
  xpToNextLevel: number;
}

// L'état global du jeu
export interface GameState {
  factions: Faction[];
  quests: Quest[];
  currency: number;
  lastDailyReset: string;   // ISO date string
  lastWeeklyReset: string;  // ISO date string
}
