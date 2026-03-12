import { Faction, Quest } from '../types';

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
  while (newXP >= faction.xpToNextLevel) {
    newXP -= faction.xpToNextLevel;
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
