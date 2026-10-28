import { Player, ProfileStore, LegacyPlayersStore } from '../types';

// Une ligne de la table Supabase `players` (une seule par compte)
export interface RemotePlayerRow {
  id: string;
  data: Player;
  updated_at: string;
}

export const EMPTY_STORE: ProfileStore = { player: null };

function time(iso: string | undefined): number {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

function isLegacyStore(raw: unknown): raw is LegacyPlayersStore {
  return !!raw && typeof raw === 'object' && Array.isArray((raw as LegacyPlayersStore).players);
}

// Choisit le profil gardé parmi plusieurs : le plus récemment modifié,
// puis le profil actif, puis le plus récemment créé
export function pickProfile(players: Player[], activePlayerId: string | null = null): Player | null {
  const ranked = [...players].sort(
    (a, b) =>
      time(b.updatedAt) - time(a.updatedAt) ||
      Number(b.id === activePlayerId) - Number(a.id === activePlayerId) ||
      time(b.createdAt) - time(a.createdAt)
  );
  return ranked[0] ?? null;
}

// Lit un store sauvegardé, ancien format multi-profils compris.
// Renvoie aussi les profils écartés pour pouvoir les mettre de côté.
export function normalizeStore(raw: unknown): { store: ProfileStore; discarded: Player[] } {
  if (isLegacyStore(raw)) {
    const player = pickProfile(raw.players, raw.activePlayerId);
    return {
      store: { player, dirty: !!player && (raw.pending?.dirty.includes(player.id) ?? false) },
      discarded: raw.players.filter(p => p !== player),
    };
  }
  if (raw && typeof raw === 'object' && 'player' in raw) {
    return { store: raw as ProfileStore, discarded: [] };
  }
  return { store: EMPTY_STORE, discarded: [] };
}

// Après un envoi réussi : le profil n'est plus en attente, sauf s'il a été modifié pendant l'envoi
export function acknowledgeSync(store: ProfileStore, sent: Player): ProfileStore {
  if (!store.player || store.player.id !== sent.id || store.player.updatedAt !== sent.updatedAt) return store;
  return { ...store, dirty: false };
}

// Fusionne le profil du serveur dans le cache local.
// - même profil des deux côtés : la modification la plus récente gagne
// - profils différents (ex. profil sans compte face au profil déjà sur le compte) : le compte gagne,
//   le profil local est renvoyé dans `discarded` pour être mis de côté
// - rien sur le serveur : le profil local est (r)envoyé
export function mergeRemoteProfile(
  local: ProfileStore,
  rows: RemotePlayerRow[]
): { store: ProfileStore; discarded: Player | null } {
  const row = [...rows].sort((a, b) => time(b.updated_at) - time(a.updated_at))[0];
  const localPlayer = local.player;

  if (!row) return { store: { player: localPlayer, dirty: !!localPlayer }, discarded: null };

  const remote: Player = { ...row.data, id: row.id, updatedAt: row.updated_at };
  if (!localPlayer) return { store: { player: remote, dirty: false }, discarded: null };

  if (localPlayer.id !== row.id) {
    return { store: { player: remote, dirty: false }, discarded: local.dirty ? localPlayer : null };
  }

  if (local.dirty && time(localPlayer.updatedAt) >= time(row.updated_at)) {
    return { store: local, discarded: null };
  }
  return { store: { player: remote, dirty: false }, discarded: null };
}
