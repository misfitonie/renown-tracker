import { useState, useEffect, useCallback, useRef } from 'react';
import { Player, ProfileStore, GameState } from '../types';
import { getInitialGameState } from '../utils/initialData';
import { downloadJson } from '../utils/file';
import { supabase, PLAYERS_TABLE } from '../lib/supabase';
import { RemotePlayerRow, EMPTY_STORE, normalizeStore, acknowledgeSync, mergeRemoteProfile } from '../utils/sync';

const PROFILE_KEY = 'renown-tracker';
const LEGACY_KEY = 'renown-tracker-state';
const GUEST_BACKUP_KEY = 'renown-tracker-guest-backup';
// Profils écartés par le passage à « 1 compte = 1 profil » (jamais effacés automatiquement)
const PROFILES_BACKUP_KEY = 'renown-tracker-profiles-backup';
const accountKey = (userId: string) => `renown-tracker:account:${userId}`;

const SYNC_DEBOUNCE_MS = 1500;
const SYNC_INTERVAL_MS = 60_000;

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'offline' | 'error';

export type ProfileFormData = { name: string; emoji: string; color: string; avatar?: string };

function backupProfiles(players: Player[]) {
  if (players.length === 0) return;
  let saved: Player[] = [];
  try { saved = JSON.parse(localStorage.getItem(PROFILES_BACKUP_KEY) ?? '[]'); } catch { /* sauvegarde illisible : on repart d'une liste vide */ }
  const isNew = (p: Player) => !saved.some(s => s.id === p.id && s.updatedAt === p.updatedAt);
  localStorage.setItem(PROFILES_BACKUP_KEY, JSON.stringify([...saved, ...players.filter(isNew)]));
}

// Lit un store sauvegardé ; l'ancien format multi-profils est réduit au profil le plus récent
function readStore(key: string): ProfileStore | null {
  const saved = localStorage.getItem(key);
  if (!saved) return null;
  try {
    const raw = JSON.parse(saved);
    const { store, discarded } = normalizeStore(raw);
    if (discarded.length > 0) {
      backupProfiles(discarded);
      localStorage.setItem(key, JSON.stringify(store));
    }
    return store;
  } catch {
    return null;
  }
}

function getGuestStore(): ProfileStore {
  const saved = readStore(PROFILE_KEY);
  if (saved) return saved;

  // Migration depuis l'ancien format (un seul état de jeu, sans profil)
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy) {
    try {
      const legacyState = JSON.parse(legacy);
      return {
        player: {
          id: `player-${Date.now()}`,
          name: 'Joueur 1',
          emoji: '🧙',
          color: '#9d4edd',
          createdAt: new Date().toISOString(),
          gameState: legacyState,
        },
      };
    } catch { /* ancien format illisible : on repart de zéro */ }
  }

  return EMPTY_STORE;
}

function getAccountStore(userId: string): ProfileStore {
  const saved = readStore(accountKey(userId));
  if (saved) return saved;

  // Première connexion sur cet appareil : le profil local rejoint le compte
  // (si le compte a déjà un profil, c'est celui du compte qui sera gardé à la synchro)
  const guest = getGuestStore();
  const player = guest.player ? { ...guest.player, updatedAt: guest.player.updatedAt ?? new Date().toISOString() } : null;
  const store: ProfileStore = { player, dirty: !!player };
  // Écrit tout de suite : l'initialiseur peut être rappelé (StrictMode) après le nettoyage ci-dessous
  localStorage.setItem(accountKey(userId), JSON.stringify(store));
  if (guest.player) {
    localStorage.setItem(GUEST_BACKUP_KEY, JSON.stringify({ player: guest.player }));
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(LEGACY_KEY);
  }
  return store;
}

export function clearAccountCache(userId: string) {
  localStorage.removeItem(accountKey(userId));
}

export function useProfile(userId: string | null = null) {
  const [store, setStore] = useState<ProfileStore>(() =>
    userId ? getAccountStore(userId) : getGuestStore()
  );
  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    localStorage.setItem(userId ? accountKey(userId) : PROFILE_KEY, JSON.stringify(store));
  }, [store, userId]);

  // Remplace le profil et le marque à synchroniser
  const savePlayer = useCallback(
    (update: (p: Player | null) => Player | null) => {
      setStore(prev => {
        const next = update(prev.player);
        if (!next || next === prev.player) return prev;
        return { player: { ...next, updatedAt: new Date().toISOString() }, dirty: !!userId };
      });
    },
    [userId]
  );

  // --- Synchronisation avec le compte ---

  const [syncStatus, setSyncStatus] = useState<SyncStatus>(userId ? 'syncing' : 'local');
  // Première synchro terminée (réussie ou non) : sans ça, un nouvel appareil afficherait
  // la création de personnage avant d'avoir récupéré celui du compte
  const [loaded, setLoaded] = useState(!userId);
  const syncingRef = useRef(false);
  const resyncRef = useRef(false);

  const sync = useCallback(async () => {
    if (!userId || !supabase) return;
    if (syncingRef.current) { resyncRef.current = true; return; }
    if (!navigator.onLine) { setSyncStatus('offline'); setLoaded(true); return; }

    syncingRef.current = true;
    setSyncStatus('syncing');
    try {
      // 1. Récupérer le profil du compte et fusionner (le plus récent gagne)
      const { data, error } = await supabase
        .from(PLAYERS_TABLE)
        .select('id, data, updated_at');
      if (error) throw error;
      const rows = (data ?? []) as RemotePlayerRow[];
      const { store: merged, discarded } = mergeRemoteProfile(storeRef.current, rows);
      if (discarded) backupProfiles([discarded]);
      setStore(prev => mergeRemoteProfile(prev, rows).store);

      // 2. Envoyer le profil s'il reste des changements locaux
      const player = merged.player;
      if (merged.dirty && player) {
        const { error: upsertError } = await supabase.from(PLAYERS_TABLE).upsert(
          { user_id: userId, id: player.id, data: player, updated_at: player.updatedAt },
          { onConflict: 'user_id,id' }
        );
        if (upsertError) throw upsertError;
        setStore(prev => acknowledgeSync(prev, player));
      }
      setSyncStatus('synced');
    } catch (e) {
      console.error(e);
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
    } finally {
      syncingRef.current = false;
      setLoaded(true);
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
  const hasPending = !!store.dirty;
  const pendingKey = store.player?.updatedAt;
  useEffect(() => {
    if (!userId || !hasPending) return;
    const timeout = setTimeout(() => void sync(), SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [userId, hasPending, pendingKey, sync]);

  // --- Actions sur le profil ---

  const updateGameState = useCallback(
    (updater: GameState | ((prev: GameState) => GameState)) => {
      savePlayer(current => {
        if (!current) return current;
        const newGameState = typeof updater === 'function' ? updater(current.gameState) : updater;
        if (newGameState === current.gameState) return current;
        return { ...current, gameState: newGameState };
      });
    },
    [savePlayer]
  );

  const createProfile = (data: ProfileFormData) => {
    savePlayer(() => ({
      id: `player-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
      gameState: getInitialGameState(),
    }));
  };

  const editProfile = (data: ProfileFormData) => {
    savePlayer(current => (current ? { ...current, ...data } : current));
  };

  const exportProfile = () => {
    const player = store.player;
    if (!player) return;
    downloadJson(player, `renown-${player.name}-${new Date().toISOString().slice(0, 10)}.json`);
  };

  // Remplace le profil par celui du fichier. L'id du profil actuel est gardé :
  // sur un compte, c'est la même ligne qui est mise à jour sur le serveur.
  const importProfile = (jsonString: string): boolean => {
    try {
      const imported = JSON.parse(jsonString) as Player;
      if (!imported.id || !imported.name || !imported.gameState) return false;
      savePlayer(current => ({
        ...imported,
        id: current?.id ?? `player-${Date.now()}`,
        createdAt: current?.createdAt ?? imported.createdAt ?? new Date().toISOString(),
      }));
      return true;
    } catch {
      return false;
    }
  };

  return {
    player: store.player,
    loaded,
    syncStatus,
    hasPendingChanges: hasPending,
    syncNow: sync,
    updateGameState,
    createProfile,
    editProfile,
    exportProfile,
    importProfile,
  };
}
