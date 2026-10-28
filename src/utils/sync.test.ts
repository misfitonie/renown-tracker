import { describe, it, expect } from 'vitest';
import { Player, PlayersStore } from '../types';
import { getInitialGameState } from './initialData';
import { mergeRemotePlayers, acknowledgeSync, markDirty, markDeleted, RemotePlayerRow } from './sync';

const player = (id: string, updatedAt: string, name = id): Player => ({
  id,
  name,
  emoji: '🧙',
  color: '#9d4edd',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt,
  gameState: getInitialGameState(),
});

const row = (p: Player): RemotePlayerRow => ({ id: p.id, data: p, updated_at: p.updatedAt! });

const T1 = '2026-10-01T10:00:00.000Z';
const T2 = '2026-10-02T10:00:00.000Z';

describe('mergeRemotePlayers', () => {
  it('prend la version du serveur pour un profil non modifié localement', () => {
    const local: PlayersStore = { activePlayerId: 'a', players: [player('a', T1, 'ancien')] };
    const merged = mergeRemotePlayers(local, [row(player('a', T2, 'nouveau'))]);
    expect(merged.players[0].name).toBe('nouveau');
    expect(merged.activePlayerId).toBe('a');
  });

  it('garde la version locale modifiée si elle est plus récente', () => {
    const local: PlayersStore = {
      activePlayerId: 'a',
      players: [player('a', T2, 'local')],
      pending: { dirty: ['a'], deleted: [] },
    };
    const merged = mergeRemotePlayers(local, [row(player('a', T1, 'serveur'))]);
    expect(merged.players[0].name).toBe('local');
    expect(merged.pending?.dirty).toEqual(['a']);
  });

  it('la version du serveur gagne si elle est plus récente que la modification locale', () => {
    const local: PlayersStore = {
      activePlayerId: 'a',
      players: [player('a', T1, 'local')],
      pending: { dirty: ['a'], deleted: [] },
    };
    const merged = mergeRemotePlayers(local, [row(player('a', T2, 'serveur'))]);
    expect(merged.players[0].name).toBe('serveur');
    expect(merged.pending?.dirty).toEqual([]);
  });

  it('ajoute les profils créés sur un autre appareil', () => {
    const local: PlayersStore = { activePlayerId: 'a', players: [player('a', T1)] };
    const merged = mergeRemotePlayers(local, [row(player('a', T1)), row(player('b', T1))]);
    expect(merged.players.map(p => p.id)).toEqual(['a', 'b']);
  });

  it('garde les profils locaux pas encore envoyés', () => {
    const local: PlayersStore = {
      activePlayerId: 'new',
      players: [player('new', T1)],
      pending: { dirty: ['new'], deleted: [] },
    };
    const merged = mergeRemotePlayers(local, []);
    expect(merged.players.map(p => p.id)).toEqual(['new']);
    expect(merged.activePlayerId).toBe('new');
  });

  it('retire les profils supprimés sur un autre appareil', () => {
    const local: PlayersStore = { activePlayerId: 'a', players: [player('a', T1), player('b', T1)] };
    const merged = mergeRemotePlayers(local, [row(player('b', T1))]);
    expect(merged.players.map(p => p.id)).toEqual(['b']);
    expect(merged.activePlayerId).toBeNull();
  });

  it("ne réintroduit pas un profil supprimé localement en attente d'envoi", () => {
    const local: PlayersStore = { activePlayerId: null, players: [], pending: { dirty: [], deleted: ['a'] } };
    const merged = mergeRemotePlayers(local, [row(player('a', T1))]);
    expect(merged.players).toEqual([]);
    expect(merged.pending?.deleted).toEqual(['a']);
  });
});

describe('acknowledgeSync', () => {
  it("retire les profils envoyés, sauf ceux modifiés pendant l'envoi", () => {
    const sentA = player('a', T1);
    const sentB = player('b', T1);
    const store: PlayersStore = {
      activePlayerId: 'a',
      players: [sentA, player('b', T2)],
      pending: { dirty: ['a', 'b'], deleted: ['c'] },
    };
    const acked = acknowledgeSync(store, { players: [sentA, sentB], deleted: ['c'] });
    expect(acked.pending).toEqual({ dirty: ['b'], deleted: [] });
  });
});

describe('markDirty / markDeleted', () => {
  it('bascule un profil entre modifié et supprimé sans doublon', () => {
    let pending = markDirty({ dirty: [], deleted: [] }, 'a');
    pending = markDirty(pending, 'a');
    expect(pending).toEqual({ dirty: ['a'], deleted: [] });
    pending = markDeleted(pending, 'a');
    expect(pending).toEqual({ dirty: [], deleted: ['a'] });
  });
});
