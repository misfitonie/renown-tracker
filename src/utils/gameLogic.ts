import { Faction, GameState, HistoryEntry, Quest, QuestType } from '../types';

/**
 * Calcule l'XP nécessaire pour atteindre le prochain niveau de renommée
 * Progression linéaire simple (100, 200, 300...)
 */
export function getXPForNextLevel(currentLevel: number): number {
  return 100 * (currentLevel + 1);
}

/**
 * Vérifie si une quête est complétée selon son type
 */
export function isQuestCompleted(quest: Quest): boolean {
  if (quest.completionType === 'boolean') {
    return quest.completed;
  }
  // Type 'progress'
  return quest.current !== undefined && quest.target !== undefined && quest.current >= quest.target;
}

/**
 * Vérifie si on doit reset les quêtes journalières
 * Reset à minuit chaque jour
 */
export function shouldResetDailies(lastResetDate: string): boolean {
  const lastReset = new Date(lastResetDate);
  const now = new Date();
  
  // Reset si c'est un jour différent
  return lastReset.toDateString() !== now.toDateString();
}

/**
 * Vérifie si on doit reset les quêtes hebdomadaires
 * Reset le lundi à minuit
 */
export function shouldResetWeeklies(lastResetDate: string): boolean {
  const lastReset = new Date(lastResetDate);
  const now = new Date();
  
  // Si même semaine, pas de reset
  const lastMonday = getLastMonday(lastReset);
  const currentMonday = getLastMonday(now);
  
  return lastMonday.getTime() !== currentMonday.getTime();
}

/**
 * Retourne le dernier lundi (ou aujourd'hui si on est lundi)
 */
function getLastMonday(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Dimanche = 0, Lundi = 1
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function shouldResetMonthlies(lastResetDate: string): boolean {
  const lastReset = new Date(lastResetDate);
  const now = new Date();
  return lastReset.getFullYear() !== now.getFullYear() || lastReset.getMonth() !== now.getMonth();
}

export function shouldResetYearlies(lastResetDate: string): boolean {
  const lastReset = new Date(lastResetDate);
  const now = new Date();
  return lastReset.getFullYear() !== now.getFullYear();
}

/**
 * Remet à zéro les quêtes d'un type donné (gère la rupture de streak)
 */
function resetQuestsOfType(quests: Quest[], type: QuestType): Quest[] {
  return quests.map(quest => {
    if (quest.type !== type) return quest;
    const streakBroken = quest.followStreak && !isQuestCompleted(quest);
    return {
      ...quest,
      completed: false,
      current: quest.completionType === 'progress' ? (quest.startingValue ?? 0) : undefined,
      streakCount: streakBroken ? 0 : quest.streakCount,
    };
  });
}

/**
 * Applique les resets daily/weekly/monthly/yearly nécessaires
 * Retourne null si aucun reset n'est nécessaire
 */
export function applyPeriodicResets(state: GameState): GameState | null {
  const epoch = new Date(0).toISOString();
  const now = new Date().toISOString();
  let updated = state;
  let changed = false;

  if (shouldResetDailies(state.lastDailyReset)) {
    updated = { ...updated, quests: resetQuestsOfType(updated.quests, 'daily'), lastDailyReset: now };
    changed = true;
  }
  if (shouldResetWeeklies(state.lastWeeklyReset)) {
    updated = { ...updated, quests: resetQuestsOfType(updated.quests, 'weekly'), lastWeeklyReset: now };
    changed = true;
  }
  if (shouldResetMonthlies(state.lastMonthlyReset ?? epoch)) {
    updated = { ...updated, quests: resetQuestsOfType(updated.quests, 'monthly'), lastMonthlyReset: now };
    changed = true;
  }
  if (shouldResetYearlies(state.lastYearlyReset ?? epoch)) {
    updated = { ...updated, quests: resetQuestsOfType(updated.quests, 'yearly'), lastYearlyReset: now };
    changed = true;
  }

  return changed ? updated : null;
}

/**
 * Retire de l'XP à une faction et gère la descente de niveau
 * Retourne la faction mise à jour et le nombre de niveaux perdus
 */
export function removeXPFromFaction(faction: Faction, xpAmount: number): { faction: Faction; levelsLost: number } {
  let newXP = faction.currentXP - xpAmount;
  let newLevel = faction.renownLevel;

  while (newXP < 0 && newLevel > 0) {
    newLevel--;
    newXP += getXPForNextLevel(newLevel);
  }

  newXP = Math.max(0, newXP);

  return {
    faction: {
      ...faction,
      renownLevel: newLevel,
      currentXP: newXP,
      xpToNextLevel: getXPForNextLevel(newLevel),
    },
    levelsLost: faction.renownLevel - newLevel,
  };
}

/**
 * Retire de l'XP joueur et gère la descente de niveau joueur
 */
export function removePlayerXP(
  currentXP: number,
  currentLevel: number,
  amount: number
): { playerXP: number; playerLevel: number } {
  let xp = currentXP - amount;
  let level = currentLevel;

  while (xp < 0 && level > 0) {
    level--;
    xp += getXPForNextLevel(level);
  }

  return { playerXP: Math.max(0, xp), playerLevel: level };
}

/**
 * Ajoute de l'XP joueur et gère les level-ups du joueur
 * Chaque level-up de faction récompense renownLevel × 50 XP joueur
 */
export function addPlayerXP(
  currentXP: number,
  currentLevel: number,
  amount: number
): { playerXP: number; playerLevel: number } {
  let xp = currentXP + amount;
  let level = currentLevel;
  while (xp >= getXPForNextLevel(level)) {
    xp -= getXPForNextLevel(level);
    level++;
  }
  return { playerXP: xp, playerLevel: level };
}

/**
 * Ajoute de l'XP à une faction et gère le level up
 * Retourne la faction mise à jour et un booléen indiquant si level up
 */
export function addXPToFaction(faction: Faction, xpAmount: number): { faction: Faction; leveledUp: boolean } {
  let newXP = faction.currentXP + xpAmount;
  let newLevel = faction.renownLevel;
  let leveledUp = false;

  // Gérer les level ups multiples si nécessaire
  while (newXP >= getXPForNextLevel(newLevel)) {
    newXP -= getXPForNextLevel(newLevel);
    newLevel++;
    leveledUp = true;
  }

  const updatedFaction: Faction = {
    ...faction,
    renownLevel: newLevel,
    currentXP: newXP,
    xpToNextLevel: getXPForNextLevel(newLevel),
  };

  return { faction: updatedFaction, leveledUp };
}

export const HISTORY_MAX_ENTRIES = 500;

/**
 * Compare deux états et ajoute à l'historique les quêtes validées/dévalidées
 * et les changements de niveau (factions et joueur)
 */
export function recordHistory(prev: GameState, next: GameState): GameState {
  const at = new Date().toISOString();
  const entries: Omit<HistoryEntry, 'id' | 'at'>[] = [];
  const factionOf = (id: string) => next.factions.find(f => f.id === id) ?? prev.factions.find(f => f.id === id);

  for (const quest of next.quests) {
    const before = prev.quests.find(q => q.id === quest.id);
    if (!before) continue;
    const wasCompleted = isQuestCompleted(before);
    const nowCompleted = isQuestCompleted(quest);
    if (wasCompleted === nowCompleted) continue;
    const faction = factionOf(quest.factionId);
    entries.push({
      type: nowCompleted ? 'quest_completed' : 'quest_uncompleted',
      questTitle: quest.title,
      factionName: faction?.name,
      factionIcon: faction?.icon,
      xp: quest.xpReward,
      currency: quest.currencyReward,
    });
  }

  for (const faction of next.factions) {
    const before = prev.factions.find(f => f.id === faction.id);
    if (!before || before.renownLevel === faction.renownLevel) continue;
    entries.push({
      type: faction.renownLevel > before.renownLevel ? 'faction_level_up' : 'faction_level_down',
      factionName: faction.name,
      factionIcon: faction.icon,
      level: faction.renownLevel,
    });
  }

  if (next.playerLevel !== prev.playerLevel) {
    entries.push({
      type: next.playerLevel > prev.playerLevel ? 'player_level_up' : 'player_level_down',
      level: next.playerLevel,
    });
  }

  if (entries.length === 0) return next;

  const stamped = entries.map((e, i) => ({ ...e, id: `history-${Date.now()}-${i}`, at }));
  return {
    ...next,
    history: [...stamped.reverse(), ...(next.history ?? [])].slice(0, HISTORY_MAX_ENTRIES),
  };
}
