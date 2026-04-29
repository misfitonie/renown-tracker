import { useEffect } from 'react';
import { GameState, Quest, Faction, FactionId } from '../types';
import { getInitialGameState } from '../utils/initialData';
import { shouldResetDailies, shouldResetWeeklies, shouldResetMonthlies, shouldResetYearlies, addXPToFaction, addPlayerXP, removeXPFromFaction, removePlayerXP, isQuestCompleted, getXPForNextLevel } from '../utils/gameLogic';
import { QuestFormData } from '../components/QuestFormModal';
import { FactionFormData } from '../components/FactionFormModal';
import { ToastType } from './useToast';
import i18n from '../i18n';

export function useGameState(
  gameState: GameState,
  setGameState: (updater: GameState | ((prev: GameState) => GameState)) => void,
  showToast: (message: string, type?: ToastType) => void,
  onFactionLevelUp?: (factionId: string) => void
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
            current: quest.completionType === 'progress' ? (quest.startingValue ?? 0) : undefined,
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
            current: quest.completionType === 'progress' ? (quest.startingValue ?? 0) : undefined,
            streakCount: streakBroken ? 0 : quest.streakCount,
          };
        }),
        lastWeeklyReset: new Date().toISOString(),
      };
      needsUpdate = true;
    }

    // Reset monthlies si nécessaire
    if (shouldResetMonthlies(gameState.lastMonthlyReset ?? new Date(0).toISOString())) {
      updatedState = {
        ...updatedState,
        quests: updatedState.quests.map(quest => {
          if (quest.type !== 'monthly') return quest;
          const streakBroken = quest.followStreak && !isQuestCompleted(quest);
          return {
            ...quest,
            completed: false,
            current: quest.completionType === 'progress' ? (quest.startingValue ?? 0) : undefined,
            streakCount: streakBroken ? 0 : quest.streakCount,
          };
        }),
        lastMonthlyReset: new Date().toISOString(),
      };
      needsUpdate = true;
    }

    // Reset yearlies si nécessaire
    if (shouldResetYearlies(gameState.lastYearlyReset ?? new Date(0).toISOString())) {
      updatedState = {
        ...updatedState,
        quests: updatedState.quests.map(quest => {
          if (quest.type !== 'yearly') return quest;
          const streakBroken = quest.followStreak && !isQuestCompleted(quest);
          return {
            ...quest,
            completed: false,
            current: quest.completionType === 'progress' ? (quest.startingValue ?? 0) : undefined,
            streakCount: streakBroken ? 0 : quest.streakCount,
          };
        }),
        lastYearlyReset: new Date().toISOString(),
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

    let finalQuests = gameState.quests.map(q =>
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

    let finalFactions = [...gameState.factions];
    finalFactions[factionIndex] = updatedFaction;

    let finalCurrency = gameState.currency + quest.currencyReward;
    let finalPlayerUpdate = leveledUp
      ? addPlayerXP(gameState.playerXP, gameState.playerLevel, getXPForNextLevel(updatedFaction.renownLevel - 1))
      : { playerXP: gameState.playerXP, playerLevel: gameState.playerLevel };

    // Auto-incrémenter la quête hebdo liée
    if (quest.linkedWeeklyQuestId) {
      const weekly = finalQuests.find(q => q.id === quest.linkedWeeklyQuestId);
      if (weekly && !isQuestCompleted(weekly) && weekly.completionType === 'progress') {
        const newCurrent = (weekly.current ?? 0) + 1;
        const weeklyNowComplete = weekly.target !== undefined && newCurrent >= weekly.target;

        finalQuests = finalQuests.map(q =>
          q.id === weekly.id
            ? {
                ...q,
                current: newCurrent,
                completed: weeklyNowComplete,
                streakCount: weeklyNowComplete && q.followStreak ? (q.streakCount ?? 0) + 1 : q.streakCount,
              }
            : q
        );

        if (weeklyNowComplete) {
          const weeklyFactionIdx = finalFactions.findIndex(f => f.id === weekly.factionId);
          if (weeklyFactionIdx !== -1) {
            const { faction: wFaction, leveledUp: wLeveledUp } = addXPToFaction(
              finalFactions[weeklyFactionIdx],
              weekly.xpReward
            );
            finalFactions = [...finalFactions];
            finalFactions[weeklyFactionIdx] = wFaction;
            finalCurrency += weekly.currencyReward;

            if (wLeveledUp) {
              finalPlayerUpdate = addPlayerXP(finalPlayerUpdate.playerXP, finalPlayerUpdate.playerLevel, getXPForNextLevel(wFaction.renownLevel - 1));
              showToast(i18n.t('toast.factionLevelUp', { name: wFaction.name, level: wFaction.renownLevel }), 'success');
              onFactionLevelUp?.(weekly.factionId);
            }
          }
          showToast(i18n.t('toast.weeklyCompleted', { title: weekly.title }), 'success');
        }
      }
    }

    setGameState({
      ...gameState,
      quests: finalQuests,
      factions: finalFactions,
      currency: finalCurrency,
      ...finalPlayerUpdate,
    });

    if (leveledUp) {
      showToast(i18n.t('toast.factionLevelUp', { name: updatedFaction.name, level: updatedFaction.renownLevel }), 'success');
      onFactionLevelUp?.(quest.factionId);
    }
  };

  // Incrémenter la progression d'une quête
  const incrementQuestProgress = (questId: string) => {
    const quest = gameState.quests.find(q => q.id === questId);
    if (!quest || quest.completionType !== 'progress' || isQuestCompleted(quest)) return;

    const newCurrent = (quest.current || 0) + 1;
    const isNowCompleted = quest.target !== undefined && newCurrent >= quest.target;

    let finalQuests = gameState.quests.map(q =>
      q.id === questId
        ? {
            ...q,
            current: newCurrent,
            completed: isNowCompleted,
            streakCount: isNowCompleted && q.followStreak ? (q.streakCount ?? 0) + 1 : q.streakCount,
          }
        : q
    );

    let finalFactions = [...gameState.factions];
    let finalCurrency = gameState.currency;
    let finalPlayerUpdate = { playerXP: gameState.playerXP, playerLevel: gameState.playerLevel };

    // Incrémenter la weekly liée de +1 à chaque clic
    if (quest.linkedWeeklyQuestId) {
      const weekly = finalQuests.find(q => q.id === quest.linkedWeeklyQuestId);
      if (weekly && !isQuestCompleted(weekly) && weekly.completionType === 'progress') {
        const weeklyNewCurrent = (weekly.current ?? 0) + 1;
        const weeklyNowComplete = weekly.target !== undefined && weeklyNewCurrent >= weekly.target;

        finalQuests = finalQuests.map(q =>
          q.id === weekly.id
            ? {
                ...q,
                current: Math.min(weeklyNewCurrent, weekly.target ?? weeklyNewCurrent),
                completed: weeklyNowComplete,
                streakCount: weeklyNowComplete && q.followStreak ? (q.streakCount ?? 0) + 1 : q.streakCount,
              }
            : q
        );

        if (weeklyNowComplete) {
          const weeklyFactionIdx = finalFactions.findIndex(f => f.id === weekly.factionId);
          if (weeklyFactionIdx !== -1) {
            const { faction: wFaction, leveledUp: wLeveledUp } = addXPToFaction(
              finalFactions[weeklyFactionIdx],
              weekly.xpReward
            );
            finalFactions = [...finalFactions];
            finalFactions[weeklyFactionIdx] = wFaction;
            finalCurrency += weekly.currencyReward;

            if (wLeveledUp) {
              finalPlayerUpdate = addPlayerXP(finalPlayerUpdate.playerXP, finalPlayerUpdate.playerLevel, getXPForNextLevel(wFaction.renownLevel - 1));
              showToast(i18n.t('toast.factionLevelUp', { name: wFaction.name, level: wFaction.renownLevel }), 'success');
              onFactionLevelUp?.(weekly.factionId);
            }
          }
          showToast(i18n.t('toast.weeklyCompleted', { title: weekly.title }), 'success');
        }
      }
    }

    if (isNowCompleted) {
      const factionIndex = finalFactions.findIndex(f => f.id === quest.factionId);
      if (factionIndex === -1) { setGameState({ ...gameState, quests: finalQuests }); return; }

      const { faction: updatedFaction, leveledUp } = addXPToFaction(
        finalFactions[factionIndex],
        quest.xpReward
      );
      finalFactions = [...finalFactions];
      finalFactions[factionIndex] = updatedFaction;
      finalCurrency += quest.currencyReward;

      if (leveledUp) {
        finalPlayerUpdate = addPlayerXP(finalPlayerUpdate.playerXP, finalPlayerUpdate.playerLevel, getXPForNextLevel(updatedFaction.renownLevel - 1));
        showToast(i18n.t('toast.factionLevelUp', { name: updatedFaction.name, level: updatedFaction.renownLevel }), 'success');
        onFactionLevelUp?.(quest.factionId);
      }
    }

    setGameState({
      ...gameState,
      quests: finalQuests,
      factions: finalFactions,
      currency: finalCurrency,
      ...finalPlayerUpdate,
    });
  };

  // Décocher une quête (annule XP, currency et régresse le niveau si nécessaire)
  const uncompleteQuest = (questId: string) => {
    const quest = gameState.quests.find(q => q.id === questId);
    if (!quest || !isQuestCompleted(quest)) return;

    let finalQuests = gameState.quests.map(q =>
      q.id === questId
        ? {
            ...q,
            completed: false,
            current: q.completionType === 'progress' ? (q.startingValue ?? 0) : undefined,
            streakCount: q.followStreak ? Math.max(0, (q.streakCount ?? 1) - 1) : q.streakCount,
          }
        : q
    );

    const factionIndex = gameState.factions.findIndex(f => f.id === quest.factionId);
    let finalFactions = [...gameState.factions];
    let finalCurrency = Math.max(0, gameState.currency - quest.currencyReward);
    let playerUpdate = { playerXP: gameState.playerXP, playerLevel: gameState.playerLevel };

    if (factionIndex !== -1) {
      const { faction: updatedFaction, levelsLost } = removeXPFromFaction(
        finalFactions[factionIndex],
        quest.xpReward
      );
      finalFactions[factionIndex] = updatedFaction;

      if (levelsLost > 0) {
        let xpToReverse = 0;
        for (let l = updatedFaction.renownLevel; l < updatedFaction.renownLevel + levelsLost; l++) {
          xpToReverse += getXPForNextLevel(l);
        }
        playerUpdate = removePlayerXP(gameState.playerXP, gameState.playerLevel, xpToReverse);
      }
    }

    // Décrémenter la quête hebdo liée
    if (quest.linkedWeeklyQuestId) {
      const weekly = finalQuests.find(q => q.id === quest.linkedWeeklyQuestId);
      if (weekly && weekly.completionType === 'progress') {
        const decrement = quest.completionType === 'progress' ? (quest.target ?? 1) : 1;
        const wasCompleted = isQuestCompleted(weekly);
        const weeklyNewCurrent = Math.max(0, (weekly.current ?? 0) - decrement);

        finalQuests = finalQuests.map(q =>
          q.id === weekly.id
            ? {
                ...q,
                current: weeklyNewCurrent,
                completed: false,
                streakCount: wasCompleted && q.followStreak ? Math.max(0, (q.streakCount ?? 1) - 1) : q.streakCount,
              }
            : q
        );

        // Reverser l'XP et currency de la weekly si elle était complétée
        if (wasCompleted) {
          const weeklyFactionIdx = finalFactions.findIndex(f => f.id === weekly.factionId);
          if (weeklyFactionIdx !== -1) {
            const { faction: wFaction, levelsLost: wLevelsLost } = removeXPFromFaction(
              finalFactions[weeklyFactionIdx],
              weekly.xpReward
            );
            finalFactions = [...finalFactions];
            finalFactions[weeklyFactionIdx] = wFaction;
            finalCurrency = Math.max(0, finalCurrency - weekly.currencyReward);

            if (wLevelsLost > 0) {
              let xpToReverse = 0;
              for (let l = wFaction.renownLevel; l < wFaction.renownLevel + wLevelsLost; l++) {
                xpToReverse += getXPForNextLevel(l);
              }
              playerUpdate = removePlayerXP(playerUpdate.playerXP, playerUpdate.playerLevel, xpToReverse);
            }
          }
        }
      }
    }

    setGameState({
      ...gameState,
      quests: finalQuests,
      factions: finalFactions,
      currency: finalCurrency,
      ...playerUpdate,
    });
  };

  // Ajouter une quête
  const addQuest = (data: QuestFormData) => {
    const newQuest: Quest = {
      ...data,
      id: `quest-${Date.now()}`,
      completed: false,
      current: data.completionType === 'progress' ? (data.startingValue ?? 0) : undefined,
      target: data.completionType === 'progress' ? data.target : undefined,
      startingValue: data.completionType === 'progress' ? (data.startingValue ?? 0) : undefined,
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
              startingValue: data.completionType === 'progress' ? (data.startingValue ?? 0) : undefined,
              current: data.completionType === 'progress' ? (data.startingValue ?? 0) : undefined,
              completed: false,
            }
          : q
      ),
    }));
  };

  // Supprimer une quête
  const deleteQuest = (questId: string) => {
    if (confirm(i18n.t('quest.deleteConfirm'))) {
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
        renownLevel: 0,
        currentXP: 0,
        xpToNextLevel: getXPForNextLevel(0),
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
    if (confirm(i18n.t('faction.deleteConfirm'))) {
      setGameState(prev => ({
        ...prev,
        factions: prev.factions.filter(f => f.id !== factionId),
        quests: prev.quests.filter(q => q.factionId !== factionId),
      }));
    }
  };

  // Reset des données du joueur actif
  const resetAllData = () => {
    if (confirm(i18n.t('app.confirm.reset'))) {
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
      showToast(i18n.t('toast.importSuccess'), 'success');
    } catch (e) {
      showToast(i18n.t('toast.importError'), 'error');
      console.error(e);
    }
  };

  // Import d'une faction exportée (génère de nouveaux IDs pour éviter les conflits)
  const importFaction = (jsonString: string) => {
    try {
      const { faction, quests } = JSON.parse(jsonString);
      const newFactionId = `faction-${Date.now()}`;
      const newFaction = { ...faction, id: newFactionId };
      const newQuests = (quests as Quest[]).map((q, i) => ({
        ...q,
        id: `quest-${Date.now()}-${i}`,
        factionId: newFactionId,
      }));
      setGameState(prev => ({
        ...prev,
        factions: [...prev.factions, newFaction],
        quests: [...prev.quests, ...newQuests],
      }));
      showToast(i18n.t('toast.factionImportSuccess'), 'success');
    } catch (e) {
      showToast(i18n.t('toast.factionImportError'), 'error');
      console.error(e);
    }
  };

  const reorderFactions = (newFactions: Faction[]) => {
    setGameState(prev => ({ ...prev, factions: newFactions }));
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
    reorderFactions,
    resetAllData,
    exportData,
    importData,
    importFaction,
  };
}
