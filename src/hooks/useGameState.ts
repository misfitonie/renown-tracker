import { useEffect } from 'react';
import { GameState, Quest, FactionId } from '../types';
import { getInitialGameState } from '../utils/initialData';
import { shouldResetDailies, shouldResetWeeklies, addXPToFaction, isQuestCompleted, getXPForNextLevel } from '../utils/gameLogic';
import { QuestFormData } from '../components/QuestFormModal';
import { FactionFormData } from '../components/FactionFormModal';
import { ToastType } from './useToast';

export function useGameState(
  gameState: GameState,
  setGameState: (updater: GameState | ((prev: GameState) => GameState)) => void,
  showToast: (message: string, type?: ToastType) => void
) {

  // Vérifier et reset les quêtes au chargement
  useEffect(() => {
    let needsUpdate = false;
    let updatedState = { ...gameState };

    // Reset dailies si nécessaire
    if (shouldResetDailies(gameState.lastDailyReset)) {
      updatedState = {
        ...updatedState,
        quests: updatedState.quests.map(quest => {
          if (quest.type !== 'daily') return quest;
          const streakBroken = quest.followStreak && !isQuestCompleted(quest);
          return {
            ...quest,
            completed: false,
            current: quest.completionType === 'progress' ? 0 : undefined,
            streakCount: streakBroken ? 0 : quest.streakCount,
          };
        }),
        lastDailyReset: new Date().toISOString(),
      };
      needsUpdate = true;
    }

    // Reset weeklies si nécessaire
    if (shouldResetWeeklies(gameState.lastWeeklyReset)) {
      updatedState = {
        ...updatedState,
        quests: updatedState.quests.map(quest => {
          if (quest.type !== 'weekly') return quest;
          const streakBroken = quest.followStreak && !isQuestCompleted(quest);
          return {
            ...quest,
            completed: false,
            current: quest.completionType === 'progress' ? 0 : undefined,
            streakCount: streakBroken ? 0 : quest.streakCount,
          };
        }),
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
    const quest = gameState.quests.find(q => q.id === questId);
    if (!quest || isQuestCompleted(quest)) return;

    const updatedQuests = gameState.quests.map(q =>
      q.id === questId
        ? { ...q, completed: true, streakCount: q.followStreak ? (q.streakCount ?? 0) + 1 : q.streakCount }
        : q
    );

    const factionIndex = gameState.factions.findIndex(f => f.id === quest.factionId);
    if (factionIndex === -1) return;

    const { faction: updatedFaction, leveledUp } = addXPToFaction(
      gameState.factions[factionIndex],
      quest.xpReward
    );

    const updatedFactions = [...gameState.factions];
    updatedFactions[factionIndex] = updatedFaction;

    setGameState({
      ...gameState,
      quests: updatedQuests,
      factions: updatedFactions,
      currency: gameState.currency + quest.currencyReward,
    });

    if (leveledUp) {
      showToast(`🎉 ${updatedFaction.name} niveau ${updatedFaction.renownLevel} !`, 'success');
    }
  };

  // Incrémenter la progression d'une quête
  const incrementQuestProgress = (questId: string) => {
    const quest = gameState.quests.find(q => q.id === questId);
    if (!quest || quest.completionType !== 'progress' || isQuestCompleted(quest)) return;

    const newCurrent = (quest.current || 0) + 1;
    const isNowCompleted = quest.target !== undefined && newCurrent >= quest.target;

    const updatedQuests = gameState.quests.map(q =>
      q.id === questId
        ? {
            ...q,
            current: newCurrent,
            completed: isNowCompleted,
            streakCount: isNowCompleted && q.followStreak ? (q.streakCount ?? 0) + 1 : q.streakCount,
          }
        : q
    );

    if (isNowCompleted) {
      const factionIndex = gameState.factions.findIndex(f => f.id === quest.factionId);
      if (factionIndex === -1) { setGameState({ ...gameState, quests: updatedQuests }); return; }

      const { faction: updatedFaction, leveledUp } = addXPToFaction(
        gameState.factions[factionIndex],
        quest.xpReward
      );

      const updatedFactions = [...gameState.factions];
      updatedFactions[factionIndex] = updatedFaction;

      setGameState({
        ...gameState,
        quests: updatedQuests,
        factions: updatedFactions,
        currency: gameState.currency + quest.currencyReward,
      });

      if (leveledUp) {
        showToast(`🎉 ${updatedFaction.name} niveau ${updatedFaction.renownLevel} !`, 'success');
      }
    } else {
      setGameState({ ...gameState, quests: updatedQuests });
    }
  };

  // Décocher une quête (annule XP et currency)
  const uncompleteQuest = (questId: string) => {
    const quest = gameState.quests.find(q => q.id === questId);
    if (!quest || !isQuestCompleted(quest)) return;

    const updatedQuests = gameState.quests.map(q =>
      q.id === questId
        ? {
            ...q,
            completed: false,
            current: q.completionType === 'progress' ? 0 : undefined,
            streakCount: q.followStreak ? Math.max(0, (q.streakCount ?? 1) - 1) : q.streakCount,
          }
        : q
    );

    const factionIndex = gameState.factions.findIndex(f => f.id === quest.factionId);
    const updatedFactions = [...gameState.factions];
    if (factionIndex !== -1) {
      const f = updatedFactions[factionIndex];
      updatedFactions[factionIndex] = {
        ...f,
        currentXP: Math.max(0, f.currentXP - quest.xpReward),
      };
    }

    setGameState({
      ...gameState,
      quests: updatedQuests,
      factions: updatedFactions,
      currency: Math.max(0, gameState.currency - quest.currencyReward),
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
      streakCount: 0,
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

  // Ajouter une faction
  const addFaction = (data: FactionFormData) => {
    const id = `faction-${Date.now()}`;
    setGameState(prev => ({
      ...prev,
      factions: [...prev.factions, {
        id,
        name: data.name,
        icon: data.icon,
        color: data.color,
        renownLevel: 1,
        currentXP: 0,
        xpToNextLevel: getXPForNextLevel(1),
      }],
    }));
  };

  // Modifier une faction
  const editFaction = (factionId: FactionId, data: FactionFormData) => {
    setGameState(prev => ({
      ...prev,
      factions: prev.factions.map(f =>
        f.id === factionId ? { ...f, ...data } : f
      ),
    }));
  };

  // Supprimer une faction (et ses quêtes)
  const deleteFaction = (factionId: FactionId) => {
    if (confirm('Supprimer cette faction et toutes ses quêtes définitivement ?')) {
      setGameState(prev => ({
        ...prev,
        factions: prev.factions.filter(f => f.id !== factionId),
        quests: prev.quests.filter(q => q.factionId !== factionId),
      }));
    }
  };

  // Reset des données du joueur actif
  const resetAllData = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser toutes vos données ?')) {
      setGameState(getInitialGameState());
    }
  };

  // Export du gameState actif (legacy, remplacé par exportPlayer dans usePlayers)
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

  // Import du gameState actif
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
    uncompleteQuest,
    incrementQuestProgress,
    addQuest,
    editQuest,
    deleteQuest,
    addFaction,
    editFaction,
    deleteFaction,
    resetAllData,
    exportData,
    importData,
  };
}
