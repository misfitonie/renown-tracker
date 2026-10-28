import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Faction, GameState, Quest } from '../types';
import {
  addPlayerXP,
  addXPToFaction,
  applyPeriodicResets,
  getXPForNextLevel,
  HISTORY_MAX_ENTRIES,
  isQuestCompleted,
  recordHistory,
  removePlayerXP,
  removeXPFromFaction,
  shouldResetDailies,
  shouldResetMonthlies,
  shouldResetWeeklies,
  shouldResetYearlies,
} from './gameLogic';

const faction = (overrides: Partial<Faction> = {}): Faction => ({
  id: 'f1',
  name: 'Job',
  icon: '💼',
  color: '#4a9eff',
  renownLevel: 0,
  currentXP: 0,
  xpToNextLevel: 100,
  ...overrides,
});

const quest = (overrides: Partial<Quest> = {}): Quest => ({
  id: 'q1',
  title: 'Envoyer une candidature',
  description: '',
  factionId: 'f1',
  type: 'daily',
  xpReward: 50,
  currencyReward: 10,
  completionType: 'boolean',
  completed: false,
  ...overrides,
});

const state = (overrides: Partial<GameState> = {}): GameState => {
  const now = new Date().toISOString();
  return {
    factions: [faction()],
    quests: [quest()],
    currency: 0,
    playerXP: 0,
    playerLevel: 0,
    lastDailyReset: now,
    lastWeeklyReset: now,
    lastMonthlyReset: now,
    lastYearlyReset: now,
    ...overrides,
  };
};

describe('getXPForNextLevel', () => {
  it('suit une progression linéaire de 100 XP par niveau', () => {
    expect(getXPForNextLevel(0)).toBe(100);
    expect(getXPForNextLevel(1)).toBe(200);
    expect(getXPForNextLevel(4)).toBe(500);
  });
});

describe('isQuestCompleted', () => {
  it('utilise le flag completed pour une quête booléenne', () => {
    expect(isQuestCompleted(quest({ completed: true }))).toBe(true);
    expect(isQuestCompleted(quest())).toBe(false);
  });

  it('compare current et target pour une quête de progression', () => {
    expect(isQuestCompleted(quest({ completionType: 'progress', current: 2, target: 5 }))).toBe(false);
    expect(isQuestCompleted(quest({ completionType: 'progress', current: 5, target: 5 }))).toBe(true);
  });
});

describe('XP des factions', () => {
  it('monte de niveau en conservant le surplus', () => {
    const { faction: f, leveledUp } = addXPToFaction(faction({ currentXP: 80 }), 50);
    expect(leveledUp).toBe(true);
    expect(f.renownLevel).toBe(1);
    expect(f.currentXP).toBe(30);
    expect(f.xpToNextLevel).toBe(200);
  });

  it('gère plusieurs level-ups en une fois', () => {
    const { faction: f } = addXPToFaction(faction(), 350);
    expect(f.renownLevel).toBe(2);
    expect(f.currentXP).toBe(50);
  });

  it('régresse de niveau quand on retire de l\'XP', () => {
    const { faction: f, levelsLost } = removeXPFromFaction(faction({ renownLevel: 1, currentXP: 20 }), 50);
    expect(levelsLost).toBe(1);
    expect(f.renownLevel).toBe(0);
    expect(f.currentXP).toBe(70);
  });

  it('ne descend jamais sous le niveau 0 ni sous 0 XP', () => {
    const { faction: f, levelsLost } = removeXPFromFaction(faction({ currentXP: 10 }), 50);
    expect(levelsLost).toBe(0);
    expect(f.currentXP).toBe(0);
  });

  it('ajouter puis retirer la même XP revient à l\'état initial', () => {
    const start = faction({ renownLevel: 2, currentXP: 120 });
    const { faction: up } = addXPToFaction(start, 400);
    const { faction: back } = removeXPFromFaction(up, 400);
    expect(back.renownLevel).toBe(start.renownLevel);
    expect(back.currentXP).toBe(start.currentXP);
  });
});

describe('XP du joueur', () => {
  it('monte et redescend de niveau de façon symétrique', () => {
    const up = addPlayerXP(90, 0, 30);
    expect(up).toEqual({ playerXP: 20, playerLevel: 1 });
    expect(removePlayerXP(up.playerXP, up.playerLevel, 30)).toEqual({ playerXP: 90, playerLevel: 0 });
  });
});

describe('détection des resets', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 28, 10, 0)); // mercredi 28 octobre 2026
  });
  afterEach(() => vi.useRealTimers());

  it('daily : reset seulement si le jour a changé', () => {
    expect(shouldResetDailies(new Date(2026, 9, 28, 0, 1).toISOString())).toBe(false);
    expect(shouldResetDailies(new Date(2026, 9, 27, 23, 59).toISOString())).toBe(true);
  });

  it('weekly : reset quand on passe un lundi', () => {
    expect(shouldResetWeeklies(new Date(2026, 9, 26, 8, 0).toISOString())).toBe(false); // lundi même semaine
    expect(shouldResetWeeklies(new Date(2026, 9, 25, 22, 0).toISOString())).toBe(true); // dimanche précédent
  });

  it('monthly et yearly', () => {
    expect(shouldResetMonthlies(new Date(2026, 9, 1).toISOString())).toBe(false);
    expect(shouldResetMonthlies(new Date(2026, 8, 30).toISOString())).toBe(true);
    expect(shouldResetYearlies(new Date(2026, 0, 1).toISOString())).toBe(false);
    expect(shouldResetYearlies(new Date(2025, 11, 31).toISOString())).toBe(true);
  });
});

describe('applyPeriodicResets', () => {
  it('renvoie null si aucun reset n\'est nécessaire', () => {
    expect(applyPeriodicResets(state())).toBeNull();
  });

  it('remet les journalières à zéro et casse la streak des quêtes non complétées', () => {
    const yesterday = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
    const result = applyPeriodicResets(state({
      lastDailyReset: yesterday,
      quests: [
        quest({ id: 'done', completed: true, followStreak: true, streakCount: 3 }),
        quest({ id: 'missed', followStreak: true, streakCount: 4 }),
        quest({ id: 'progress', completionType: 'progress', current: 3, target: 5, startingValue: 1 }),
        quest({ id: 'weekly', type: 'weekly', completed: true }),
      ],
    }));
    expect(result).not.toBeNull();
    const byId = Object.fromEntries(result!.quests.map(q => [q.id, q]));
    expect(byId.done).toMatchObject({ completed: false, streakCount: 3 });
    expect(byId.missed).toMatchObject({ streakCount: 0 });
    expect(byId.progress.current).toBe(1);
    expect(byId.weekly.completed).toBe(true);
    expect(result!.lastDailyReset).not.toBe(yesterday);
  });
});

describe('recordHistory', () => {
  it('ne change rien si aucune quête ni aucun niveau ne change', () => {
    const s = state();
    expect(recordHistory(s, { ...s, currency: 5 })).toEqual({ ...s, currency: 5 });
  });

  it('journalise une validation avec level-up de faction et de joueur, du plus récent au plus ancien', () => {
    const prev = state();
    const next = state({
      quests: [quest({ completed: true })],
      factions: [faction({ renownLevel: 1 })],
      playerLevel: 1,
    });
    const types = recordHistory(prev, next).history!.map(h => h.type);
    expect(types).toEqual(['player_level_up', 'faction_level_up', 'quest_completed']);
  });

  it('journalise une dévalidation et garde le nom de la faction', () => {
    const prev = state({ quests: [quest({ completed: true })] });
    const [entry] = recordHistory(prev, state()).history!;
    expect(entry).toMatchObject({ type: 'quest_uncompleted', questTitle: 'Envoyer une candidature', factionName: 'Job', xp: 50, currency: 10 });
  });

  it('limite l\'historique à HISTORY_MAX_ENTRIES entrées', () => {
    const old = Array.from({ length: HISTORY_MAX_ENTRIES }, (_, i) => ({ id: `h${i}`, type: 'quest_completed' as const, at: '' }));
    const prev = state({ history: old });
    const next = state({ history: old, quests: [quest({ completed: true })] });
    const history = recordHistory(prev, next).history!;
    expect(history).toHaveLength(HISTORY_MAX_ENTRIES);
    expect(history[0].type).toBe('quest_completed');
    expect(history[0].id).not.toBe('h0');
  });
});
