import { describe, expect, it } from 'vitest';
import { buildStarterContent, DEFAULT_STARTER_IDS, getInitialGameState, STARTER_FACTIONS } from './initialData';

describe('buildStarterContent', () => {
  it('ne crée que les factions choisies, dans la langue demandée', () => {
    const { factions, quests } = buildStarterContent(['health', 'work'], 'en', 1000);
    expect(factions.map(f => f.name)).toEqual(['Work', 'Health']);
    expect(quests.every(q => factions.some(f => f.id === q.factionId))).toBe(true);
  });

  it('génère des IDs uniques et relie la quête journalière à la quête hebdo', () => {
    const { factions, quests } = buildStarterContent(STARTER_FACTIONS.map(s => s.id), 'fr', 1000);
    expect(new Set(factions.map(f => f.id)).size).toBe(STARTER_FACTIONS.length);
    expect(new Set(quests.map(q => q.id)).size).toBe(quests.length);
    const linked = quests.find(q => q.linkedWeeklyQuestId);
    const weekly = quests.find(q => q.id === linked?.linkedWeeklyQuestId);
    expect(weekly).toMatchObject({ type: 'weekly', completionType: 'progress', current: 0 });
  });

  it('aucune faction cochée : personnage sans faction', () => {
    expect(getInitialGameState([]).factions).toEqual([]);
    expect(getInitialGameState().factions).toHaveLength(DEFAULT_STARTER_IDS.length);
  });
});
