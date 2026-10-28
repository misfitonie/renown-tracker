// Types de base
export type QuestType = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type CompletionType = 'boolean' | 'progress';
export type FactionId = string;

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
  current?: number;       // si progress: ex 2
  target?: number;        // si progress: ex 5
  startingValue?: number; // si progress: valeur de départ (défaut 0)

  // Streak
  followStreak?: boolean;
  streakCount?: number;

  // Lien quête journalière → quête hebdo (progress)
  linkedWeeklyQuestId?: string;
}

// Une faction
export interface Faction {
  id: FactionId;
  name: string;
  icon: string;
  image?: string; // image importée (data URL), prioritaire sur l'icône
  color: string;  // couleur pour le UI (hex)
  renownLevel: number;
  currentXP: number;
  xpToNextLevel: number;
}

// Une entrée de l'historique des actions
export type HistoryEventType =
  | 'quest_completed'
  | 'quest_uncompleted'
  | 'faction_level_up'
  | 'faction_level_down'
  | 'player_level_up'
  | 'player_level_down';

export interface HistoryEntry {
  id: string;
  type: HistoryEventType;
  at: string;              // date ISO
  questTitle?: string;
  factionName?: string;    // copie du nom (la faction peut être supprimée)
  factionIcon?: string;
  xp?: number;
  currency?: number;
  level?: number;
}

// L'état global du jeu
export interface GameState {
  factions: Faction[];
  quests: Quest[];
  currency: number;
  playerXP: number;
  playerLevel: number;
  lastDailyReset: string;
  lastWeeklyReset: string;
  lastMonthlyReset: string;
  lastYearlyReset: string;
  history?: HistoryEntry[];
}

// Un profil joueur
export interface Player {
  id: string;
  name: string;
  emoji: string;
  avatar?: string; // image importée (data URL), prioritaire sur l'emoji
  color: string;
  createdAt: string;
  updatedAt?: string; // date ISO de la dernière modification (synchro entre appareils)
  gameState: GameState;
}

// Store local : un seul profil (le personnage du compte, ou du mode sans compte)
export interface ProfileStore {
  player: Player | null;
  // Compte connecté uniquement : profil modifié pas encore envoyé au serveur
  dirty?: boolean;
}

// Ancien format multi-profils (avant « 1 compte = 1 profil »), encore lu pour la migration
export interface LegacyPlayersStore {
  activePlayerId: string | null;
  players: Player[];
  pending?: { dirty: string[]; deleted: string[] };
}
