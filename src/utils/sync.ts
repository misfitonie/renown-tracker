import { Player, PlayersStore, PendingSync } from '../types';

// Une ligne de la table Supabase `players`
export interface RemotePlayerRow {
  id: string;
  data: Player;
  updated_at: string;
}

export const EMPTY_PENDING: PendingSync = { dirty: [], deleted: [] };

export function getPending(store: PlayersStore): PendingSync {
  return store.pending ?? EMPTY_PENDING;
}

export function hasPendingChanges(store: PlayersStore): boolean {
  const { dirty, deleted } = getPending(store);
  return dirty.length > 0 || deleted.length > 0;
}

function time(iso: string | undefined): number {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

// Marque un profil comme modifié localement (à envoyer au serveur)
export function markDirty(pending: PendingSync, playerId: string): PendingSync {
  return {
    dirty: pending.dirty.includes(playerId) ? pending.dirty : [...pending.dirty, playerId],
    deleted: pending.deleted.filter(id => id !== playerId),
  };
}

// Marque un profil comme supprimé localement (à supprimer sur le serveur)
export function markDeleted(pending: PendingSync, playerId: string): PendingSync {
  return {
    dirty: pending.dirty.filter(id => id !== playerId),
    deleted: pending.deleted.includes(playerId) ? pending.deleted : [...pending.deleted, playerId],
  };
}

// Après un envoi réussi : retire des changements en attente ce qui a été envoyé,
// sauf les profils modifiés à nouveau pendant l'envoi
export function acknowledgeSync(
  store: PlayersStore,
  sent: { players: Player[]; deleted: string[] }
): PlayersStore {
  const pending = getPending(store);
  const stillDirty = pending.dirty.filter(id => {
    const sentPlayer = sent.players.find(p => p.id === id);
    if (!sentPlayer) return true;
    const current = store.players.find(p => p.id === id);
    return !!current && current.updatedAt !== sentPlayer.updatedAt;
  });
  return {
    ...store,
    pending: {
      dirty: stillDirty,
      deleted: pending.deleted.filter(id => !sent.deleted.includes(id)),
    },
  };
}

// Fusionne les profils du serveur dans le cache local.
// Règle : la modification la plus récente gagne, profil par profil.
export function mergeRemotePlayers(local: PlayersStore, rows: RemotePlayerRow[]): PlayersStore {
  const pending = getPending(local);
  const remoteIds = new Set(rows.map(r => r.id));
  const dirty = new Set(pending.dirty);
  const players: Player[] = [];

  for (const row of rows) {
    // Supprimé sur cet appareil, la suppression n'est pas encore envoyée
    if (pending.deleted.includes(row.id)) continue;

    const localPlayer = local.players.find(p => p.id === row.id);
    if (localPlayer && dirty.has(row.id) && time(localPlayer.updatedAt) >= time(row.updated_at)) {
      players.push(localPlayer);
    } else {
      players.push({ ...row.data, id: row.id, updatedAt: row.updated_at });
      dirty.delete(row.id);
    }
  }

  // Profils locaux absents du serveur : nouveaux (gardés) ou supprimés ailleurs (retirés)
  for (const p of local.players) {
    if (!remoteIds.has(p.id) && dirty.has(p.id)) players.push(p);
  }

  // Ordre stable : ordre local d'abord, puis nouveaux profils par date de création
  const localOrder = new Map(local.players.map((p, i) => [p.id, i]));
  players.sort((a, b) => {
    const ia = localOrder.get(a.id);
    const ib = localOrder.get(b.id);
    if (ia !== undefined && ib !== undefined) return ia - ib;
    if (ia !== undefined) return -1;
    if (ib !== undefined) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });

  const activeStillExists = players.some(p => p.id === local.activePlayerId);
  return {
    activePlayerId: activeStillExists ? local.activePlayerId : null,
    players,
    pending: { dirty: [...dirty].filter(id => players.some(p => p.id === id)), deleted: pending.deleted },
  };
}
