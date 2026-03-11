import { useState, useEffect } from 'react';
import { GameState, Quest, FactionId } from '../types';
import { getInitialGameState } from '../utils/initialData';
import { shouldResetDailies, shouldResetWeeklies, addXPToFaction, isQuestCompleted } from '../utils/gameLogic';
import { QuestFormData } from '../components/QuestFormModal';
import { ToastType } from './useToast';

const STORAGE_KEY = 'renown-tracker-state';

export function useGameState(showToast: (message: string, type?: ToastType) => void) {
  const [gameState, setGameState] = useState<GameState>(() => {
    // Charger depuis localStorage au démarrage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved state:', e);
        return getInitialGameState();
      }
    }
    return getInitialGameState();
  });

  // Sauvegarder dans localStorage à chaque changement
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  }, [gameState]);

  // Vérifier et reset les quêtes au chargement
  useEffect(() => {
    let needsUpdate = false;
    let updatedState = { ...gameState };

    // Reset dailies si nécessaire
    if (shouldResetDailies(gameState.lastDailyReset)) {
      updatedState = {
        ...updatedState,
        quests: updatedState.quests.map(quest => 
          quest.type === 'daily' 
            ? { ...quest, completed: false, current: quest.completionType === 'progress' ? 0 : undefined }
            : quest
        ),
        lastDailyReset: new Date().toISOString(),
      };
      needsUpdate = true;
    }

    // Reset weeklies si nécessaire
    if (shouldResetWeeklies(gameState.lastWeeklyReset)) {
      updatedState = {
        ...updatedState,
        quests: updatedState.quests.map(quest => 
          quest.type === 'weekly'
            ? { ...quest, completed: false, current: quest.completionType === 'progress' ? 0 : undefined }
            : quest
        ),
        lastWeeklyReset: new Date().toISOString(),
      };
      needsUpdate = true;
    }

    if (needsUpdate) {
      setGameState(updatedState);
    }
  }, []);

  // Compléter une quête
  const completeQuest = (questId: string) => {
    setGameState(prevState => {
      const quest = prevState.quests.find(q => q.id === questId);
      if (!quest || isQuestCompleted(quest)) return prevState;

      // Marquer la quête comme complétée
      const updatedQuests = prevState.quests.map(q =>
        q.id === questId ? { ...q, completed: true } : q
      );

      // Ajouter XP à la faction
      const factionIndex = prevState.factions.findIndex(f => f.id === quest.factionId);
      if (factionIndex === -1) return prevState;

      const { faction: updatedFaction, leveledUp } = addXPToFaction(
        prevState.factions[factionIndex],
        quest.xpReward
      );

      const updatedFactions = [...prevState.factions];
      updatedFactions[factionIndex] = updatedFaction;

      if (leveledUp) {
        setTimeout(() => showToast(`🎉 ${updatedFaction.name} niveau ${updatedFaction.renownLevel} !`, 'success'), 100);
      }

      return {
        ...prevState,
        quests: updatedQuests,
        factions: updatedFactions,
        currency: prevState.currency + quest.currencyReward,
      };
    });
  };

  // Incrémenter la progression d'une quête
  const incrementQuestProgress = (questId: string) => {
    setGameState(prevState => {
      const quest = prevState.quests.find(q => q.id === questId);
      if (!quest || quest.completionType !== 'progress' || isQuestCompleted(quest)) {
        return prevState;
      }

      const newCurrent = (quest.current || 0) + 1;
      const isNowCompleted = quest.target !== undefined && newCurrent >= quest.target;

      const updatedQuests = prevState.quests.map(q =>
        q.id === questId 
          ? { ...q, current: newCurrent, completed: isNowCompleted }
          : q
      );

      // Si la quête vient d'être complétée, ajouter XP et currency
      if (isNowCompleted) {
        const factionIndex = prevState.factions.findIndex(f => f.id === quest.factionId);
        if (factionIndex === -1) return { ...prevState, quests: updatedQuests };

        const { faction: updatedFaction, leveledUp } = addXPToFaction(
          prevState.factions[factionIndex],
          quest.xpReward
        );

        const updatedFactions = [...prevState.factions];
        updatedFactions[factionIndex] = updatedFaction;

        if (leveledUp) {
          setTimeout(() => showToast(`🎉 ${updatedFaction.name} niveau ${updatedFaction.renownLevel} !`, 'success'), 100);
        }

        return {
          ...prevState,
          quests: updatedQuests,
          factions: updatedFactions,
          currency: prevState.currency + quest.currencyReward,
        };
      }

      return { ...prevState, quests: updatedQuests };
    });
  };

  // Ajouter une quête
  const addQuest = (data: QuestFormData) => {
    const newQuest: Quest = {
      ...data,
      id: `quest-${Date.now()}`,
      completed: false,
      current: data.completionType === 'progress' ? 0 : undefined,
      target: data.completionType === 'progress' ? data.target : undefined,
    };
    setGameState(prev => ({ ...prev, quests: [...prev.quests, newQuest] }));
  };

  // Modifier une quête existante
  const editQuest = (questId: string, data: QuestFormData) => {
    setGameState(prev => ({
      ...prev,
      quests: prev.quests.map(q =>
        q.id === questId
          ? {
              ...q,
              ...data,
              target: data.completionType === 'progress' ? data.target : undefined,
              current: data.completionType === 'progress' ? (q.current ?? 0) : undefined,
              completed: false,
            }
          : q
      ),
    }));
  };

  // Supprimer une quête
  const deleteQuest = (questId: string) => {
    if (confirm('Supprimer cette quête définitivement ?')) {
      setGameState(prev => ({ ...prev, quests: prev.quests.filter(q => q.id !== questId) }));
    }
  };

  // Reset manuel de toutes les données (pour dev/debug)
  const resetAllData = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser toutes vos données ?')) {
      setGameState(getInitialGameState());
    }
  };

  // Export des données (pour backup)
  const exportData = () => {
    const dataStr = JSON.stringify(gameState, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `renown-tracker-backup-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import des données (depuis backup)
  const importData = (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      setGameState(data);
      showToast('Données importées avec succès !', 'success');
    } catch (e) {
      showToast("Erreur lors de l'import des données", 'error');
      console.error(e);
    }
  };

  return {
    gameState,
    completeQuest,
    incrementQuestProgress,
    addQuest,
    editQuest,
    deleteQuest,
    resetAllData,
    exportData,
    importData,
  };
}
