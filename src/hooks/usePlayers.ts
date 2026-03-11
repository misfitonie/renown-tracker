import { useState, useEffect, useCallback } from 'react';
import { Player, PlayersStore, GameState } from '../types';
import { getInitialGameState } from '../utils/initialData';

const PLAYERS_KEY = 'renown-tracker';
const LEGACY_KEY = 'renown-tracker-state';

function getInitialStore(): PlayersStore {
  // Format actuel
  const saved = localStorage.getItem(PLAYERS_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }

  // Migration depuis l'ancien format
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy) {
    try {
      const legacyState = JSON.parse(legacy);
      const player: Player = {
        id: `player-${Date.now()}`,
        name: 'Joueur 1',
        emoji: '🧙',
        color: '#9d4edd',
        createdAt: new Date().toISOString(),
        gameState: legacyState,
      };
      return { activePlayerId: player.id, players: [player] };
    } catch {}
  }

  return { activePlayerId: null, players: [] };
}

export function usePlayers() {
  const [store, setStore] = useState<PlayersStore>(getInitialStore);

  useEffect(() => {
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(store));
  }, [store]);

  const activePlayer = store.players.find(p => p.id === store.activePlayerId) ?? null;

  const updateActiveGameState = useCallback(
    (updater: GameState | ((prev: GameState) => GameState)) => {
      setStore(prev => {
        const current = prev.players.find(p => p.id === prev.activePlayerId);
        if (!current) return prev;
        const newGameState =
          typeof updater === 'function' ? updater(current.gameState) : updater;
        return {
          ...prev,
          players: prev.players.map(p =>
            p.id === prev.activePlayerId ? { ...p, gameState: newGameState } : p
          ),
        };
      });
    },
    []
  );

  const createPlayer = (data: { name: string; emoji: string; color: string }) => {
    const newPlayer: Player = {
      id: `player-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
      gameState: getInitialGameState(),
    };
    setStore(prev => ({
      activePlayerId: newPlayer.id,
      players: [...prev.players, newPlayer],
    }));
  };

  const editPlayer = (
    playerId: string,
    data: { name: string; emoji: string; color: string }
  ) => {
    setStore(prev => ({
      ...prev,
      players: prev.players.map(p => (p.id === playerId ? { ...p, ...data } : p)),
    }));
  };

  const deletePlayer = (playerId: string) => {
    setStore(prev => {
      const remaining = prev.players.filter(p => p.id !== playerId);
      const newActiveId =
        prev.activePlayerId === playerId ? (remaining[0]?.id ?? null) : prev.activePlayerId;
      return { activePlayerId: newActiveId, players: remaining };
    });
  };

  const selectPlayer = (playerId: string) => {
    setStore(prev => ({ ...prev, activePlayerId: playerId }));
  };

  const exportPlayer = (playerId: string) => {
    const player = store.players.find(p => p.id === playerId);
    if (!player) return;
    const blob = new Blob([JSON.stringify(player, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `renown-${player.name}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importPlayer = (jsonString: string): boolean => {
    try {
      const player = JSON.parse(jsonString) as Player;
      if (!player.id || !player.name || !player.gameState) return false;
      // Générer un nouvel id pour éviter les conflits
      const imported: Player = { ...player, id: `player-${Date.now()}`, name: `${player.name} (importé)` };
      setStore(prev => ({ activePlayerId: imported.id, players: [...prev.players, imported] }));
      return true;
    } catch {
      return false;
    }
  };

  return {
    store,
    activePlayer,
    updateActiveGameState,
    createPlayer,
    editPlayer,
    deletePlayer,
    selectPlayer,
    exportPlayer,
    importPlayer,
  };
}
