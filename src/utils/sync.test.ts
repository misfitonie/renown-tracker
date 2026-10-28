import { describe, it, expect } from 'vitest';
import { Player, ProfileStore } from '../types';
import { getInitialGameState } from './initialData';
import { mergeRemoteProfile, acknowledgeSync, normalizeStore, pickProfile, RemotePlayerRow } from './sync';

const player = (id: string, updatedAt: string | undefined, name = id): Player => ({
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

describe('mergeRemoteProfile', () => {
  it('prend la version du serveur pour un profil non modifié localement', () => {
    const local: ProfileStore = { player: player('a', T1, 'ancien') };
    const { store } = mergeRemoteProfile(local, [row(player('a', T2, 'nouveau'))]);
    expect(store.player?.name).toBe('nouveau');
    expect(store.dirty).toBe(false);
  });

  it('garde la version locale modifiée si elle est plus récente', () => {
    const local: ProfileStore = { player: player('a', T2, 'local'), dirty: true };
    const { store } = mergeRemoteProfile(local, [row(player('a', T1, 'serveur'))]);
    expect(store.player?.name).toBe('local');
    expect(store.dirty).toBe(true);
  });

  it('la version du serveur gagne si elle est plus récente que la modification locale', () => {
    const local: ProfileStore = { player: player('a', T1, 'local'), dirty: true };
    const { store } = mergeRemoteProfile(local, [row(player('a', T2, 'serveur'))]);
    expect(store.player?.name).toBe('serveur');
    expect(store.dirty).toBe(false);
  });

  it('récupère le profil du compte sur un nouvel appareil', () => {
    const { store } = mergeRemoteProfile({ player: null }, [row(player('a', T1))]);
    expect(store.player?.id).toBe('a');
  });

  it("envoie le profil local si le compte n'en a pas encore", () => {
    const { store, discarded } = mergeRemoteProfile({ player: player('new', T1) }, []);
    expect(store.player?.id).toBe('new');
    expect(store.dirty).toBe(true);
    expect(discarded).toBeNull();
  });

  it('garde le profil du compte face à un autre profil local, et met le local de côté', () => {
    const guest = player('guest', T2, 'invité');
    const { store, discarded } = mergeRemoteProfile({ player: guest, dirty: true }, [row(player('a', T1, 'compte'))]);
    expect(store.player?.name).toBe('compte');
    expect(store.dirty).toBe(false);
    expect(discarded).toBe(guest);
  });

  it('prend la ligne la plus récente si le serveur en a encore plusieurs', () => {
    const { store } = mergeRemoteProfile({ player: null }, [row(player('a', T1)), row(player('b', T2))]);
    expect(store.player?.id).toBe('b');
  });
});

describe('acknowledgeSync', () => {
  it("n'est plus en attente après l'envoi, sauf si le profil a changé pendant l'envoi", () => {
    const sent = player('a', T1);
    expect(acknowledgeSync({ player: sent, dirty: true }, sent).dirty).toBe(false);
    expect(acknowledgeSync({ player: player('a', T2), dirty: true }, sent).dirty).toBe(true);
  });
});

describe('normalizeStore (ancien format multi-profils)', () => {
  it('garde le profil modifié le plus récemment et met les autres de côté', () => {
    const a = player('a', T1);
    const b = player('b', T2);
    const { store, discarded } = normalizeStore({
      activePlayerId: 'a',
      players: [a, b],
      pending: { dirty: ['b'], deleted: [] },
    });
    expect(store).toEqual({ player: b, dirty: true });
    expect(discarded).toEqual([a]);
  });

  it('sans date de modification, garde le profil actif', () => {
    expect(pickProfile([player('a', undefined), player('b', undefined)], 'b')?.id).toBe('b');
  });

  it('lit le nouveau format tel quel', () => {
    const store: ProfileStore = { player: player('a', T1), dirty: false };
    expect(normalizeStore(store)).toEqual({ store, discarded: [] });
  });

  it('un store vide ne contient aucun profil', () => {
    expect(normalizeStore({ activePlayerId: null, players: [] }).store.player).toBeNull();
    expect(normalizeStore(null).store.player).toBeNull();
  });
});
