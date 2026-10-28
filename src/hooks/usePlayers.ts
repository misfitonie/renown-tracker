import { useState, useEffect, useCallback, useRef } from 'react';
import { Player, PlayersStore, GameState } from '../types';
import { getInitialGameState } from '../utils/initialData';
import { downloadJson } from '../utils/file';
import { supabase, PLAYERS_TABLE } from '../lib/supabase';
import {
  RemotePlayerRow,
  EMPTY_PENDING,
  getPending,
  hasPendingChanges,
  markDirty,
  markDeleted,
  acknowledgeSync,
  mergeRemotePlayers,
} from '../utils/sync';

const PLAYERS_KEY = 'renown-tracker';
const LEGACY_KEY = 'renown-tracker-state';
const GUEST_BACKUP_KEY = 'renown-tracker-guest-backup';
const accountKey = (userId: string) => `renown-tracker:account:${userId}`;

const SYNC_DEBOUNCE_MS = 1500;
const SYNC_INTERVAL_MS = 60_000;

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'offline' | 'error';

function getGuestStore(): PlayersStore {
  // Format actuel
  const saved = localStorage.getItem(PLAYERS_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch { /* sauvegarde illisible : on tente l'ancien format */ }
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
    } catch { /* ancien format illisible : on repart de zéro */ }
  }

  return { activePlayerId: null, players: [] };
}

function getAccountStore(userId: string): PlayersStore {
  const saved = localStorage.getItem(accountKey(userId));
  if (saved) {
    try { return JSON.parse(saved); } catch { /* cache illisible : on le reconstruit depuis le serveur */ }
  }

  // Première connexion sur cet appareil : les profils locaux rejoignent le compte
  const guest = getGuestStore();
  const now = new Date().toISOString();
  const store: PlayersStore = {
    activePlayerId: guest.activePlayerId,
    players: guest.players.map(p => ({ ...p, updatedAt: p.updatedAt ?? now })),
    pending: { dirty: guest.players.map(p => p.id), deleted: [] },
  };
  // Écrit tout de suite : l'initialiseur peut être rappelé (StrictMode) après le nettoyage ci-dessous
  localStorage.setItem(accountKey(userId), JSON.stringify(store));
  if (guest.players.length > 0) {
    localStorage.setItem(GUEST_BACKUP_KEY, JSON.stringify({ activePlayerId: guest.activePlayerId, players: guest.players }));
    localStorage.removeItem(PLAYERS_KEY);
    localStorage.removeItem(LEGACY_KEY);
  }
  return store;
}

export function clearAccountCache(userId: string) {
  localStorage.removeItem(accountKey(userId));
}

export function usePlayers(userId: string | null = null) {
  const [store, setStore] = useState<PlayersStore>(() =>
    userId ? getAccountStore(userId) : getGuestStore()
  );
  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    localStorage.setItem(userId ? accountKey(userId) : PLAYERS_KEY, JSON.stringify(store));
  }, [store, userId]);

  // Applique une modification à un profil et le marque à synchroniser
  const touchPlayer = useCallback(
    (prev: PlayersStore, playerId: string, update: (p: Player) => Player): PlayersStore => ({
      ...prev,
      players: prev.players.map(p =>
        p.id === playerId ? { ...update(p), updatedAt: new Date().toISOString() } : p
      ),
      pending: userId ? markDirty(getPending(prev), playerId) : prev.pending,
    }),
    [userId]
  );

  const addPlayer = useCallback(
    (player: Player) => {
      const added = { ...player, updatedAt: new Date().toISOString() };
      setStore(prev => ({
        activePlayerId: added.id,
        players: [...prev.players, added],
        pending: userId ? markDirty(getPending(prev), added.id) : prev.pending,
      }));
    },
    [userId]
  );

  // --- Synchronisation avec le compte ---

  const [syncStatus, setSyncStatus] = useState<SyncStatus>(userId ? 'syncing' : 'local');
  const syncingRef = useRef(false);
  const resyncRef = useRef(false);

  const sync = useCallback(async () => {
    if (!userId || !supabase) return;
    if (syncingRef.current) { resyncRef.current = true; return; }
    if (!navigator.onLine) { setSyncStatus('offline'); return; }

    syncingRef.current = true;
    setSyncStatus('syncing');
    try {
      // 1. Récupérer les profils du compte et fusionner (le plus récent gagne)
      const { data, error } = await supabase
        .from(PLAYERS_TABLE)
        .select('id, data, updated_at');
      if (error) throw error;
      const rows = (data ?? []) as RemotePlayerRow[];
      const merged = mergeRemotePlayers(storeRef.current, rows);
      setStore(prev => mergeRemotePlayers(prev, rows));

      // 2. Envoyer les changements locaux restants
      const { dirty, deleted } = getPending(merged);
      const players = merged.players.filter(p => dirty.includes(p.id));
      if (players.length > 0) {
        const { error: upsertError } = await supabase.from(PLAYERS_TABLE).upsert(
          players.map(p => ({ user_id: userId, id: p.id, data: p, updated_at: p.updatedAt })),
          { onConflict: 'user_id,id' }
        );
        if (upsertError) throw upsertError;
      }
      if (deleted.length > 0) {
        const { error: deleteError } = await supabase.from(PLAYERS_TABLE).delete().in('id', deleted);
        if (deleteError) throw deleteError;
      }
      setStore(prev => acknowledgeSync(prev, { players, deleted }));
      setSyncStatus('synced');
    } catch (e) {
      console.error(e);
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
    } finally {
      syncingRef.current = false;
      if (resyncRef.current) {
        resyncRef.current = false;
        void sync();
      }
    }
  }, [userId]);

  // Au démarrage, au retour sur l'onglet, au retour du réseau, et régulièrement
  useEffect(() => {
    if (!userId) return;
    void sync();
    const onVisible = () => { if (document.visibilityState === 'visible') void sync(); };
    const onOnline = () => void sync();
    const onOffline = () => setSyncStatus('offline');
    const interval = setInterval(() => { if (document.visibilityState === 'visible') void sync(); }, SYNC_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [userId, sync]);

  // Après une modification locale, envoi groupé.
  // La clé change à chaque modification (updatedAt) mais pas après un échec : pas de boucle de relance.
  const pending = store.pending ?? EMPTY_PENDING;
  const hasPending = pending.dirty.length > 0 || pending.deleted.length > 0;
  const pendingKey = JSON.stringify([
    pending.deleted,
    pending.dirty.map(id => [id, store.players.find(p => p.id === id)?.updatedAt]),
  ]);
  useEffect(() => {
    if (!userId || !hasPending) return;
    const timeout = setTimeout(() => void sync(), SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [userId, hasPending, pendingKey, sync]);

  // --- Actions sur les profils ---

  const activePlayer = store.players.find(p => p.id === store.activePlayerId) ?? null;

  const updateActiveGameState = useCallback(
    (updater: GameState | ((prev: GameState) => GameState)) => {
      setStore(prev => {
        const current = prev.players.find(p => p.id === prev.activePlayerId);
        if (!current) return prev;
        const newGameState =
          typeof updater === 'function' ? updater(current.gameState) : updater;
        if (newGameState === current.gameState) return prev;
        return touchPlayer(prev, current.id, p => ({ ...p, gameState: newGameState }));
      });
    },
    [touchPlayer]
  );

  const createPlayer = (data: { name: string; emoji: string; color: string; avatar?: string }) => {
    addPlayer({
      id: `player-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
      gameState: getInitialGameState(),
    });
  };

  const editPlayer = (
    playerId: string,
    data: { name: string; emoji: string; color: string; avatar?: string }
  ) => {
    setStore(prev => touchPlayer(prev, playerId, p => ({ ...p, ...data })));
  };

  const deletePlayer = (playerId: string) => {
    setStore(prev => {
      const remaining = prev.players.filter(p => p.id !== playerId);
      const newActiveId =
        prev.activePlayerId === playerId ? (remaining[0]?.id ?? null) : prev.activePlayerId;
      return {
        activePlayerId: newActiveId,
        players: remaining,
        pending: userId ? markDeleted(getPending(prev), playerId) : prev.pending,
      };
    });
  };

  const selectPlayer = (playerId: string) => {
    setStore(prev => ({ ...prev, activePlayerId: playerId }));
  };

  const exportPlayer = (playerId: string) => {
    const player = store.players.find(p => p.id === playerId);
    if (!player) return;
    downloadJson(player, `renown-${player.name}-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const importPlayer = (jsonString: string): boolean => {
    try {
      const player = JSON.parse(jsonString) as Player;
      if (!player.id || !player.name || !player.gameState) return false;
      // Générer un nouvel id pour éviter les conflits
      addPlayer({ ...player, id: `player-${Date.now()}`, name: `${player.name} (importé)` });
      return true;
    } catch {
      return false;
    }
  };

  return {
    store,
    activePlayer,
    syncStatus,
    hasPendingChanges: hasPendingChanges(store),
    syncNow: sync,
    updateActiveGameState,
    createPlayer,
    editPlayer,
    deletePlayer,
    selectPlayer,
    exportPlayer,
    importPlayer,
  };
}
