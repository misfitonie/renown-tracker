import { describe, expect, it } from 'vitest';
import { Faction, Quest } from '../types';
import {
  instantiateTemplate,
  MARKETPLACE_LIMITS,
  PSEUDO_PATTERN,
  sanitizeSearch,
  toFactionTemplate,
  validateTemplate,
} from './marketplace';

const faction: Faction = {
  id: 'f1',
  name: 'Sport',
  icon: '🏃',
  color: '#ff6b35',
  renownLevel: 7,
  currentXP: 420,
  xpToNextLevel: 800,
};

const quest = (overrides: Partial<Quest> = {}): Quest => ({
  id: 'q-a',
  title: 'Courir',
  description: '',
  factionId: 'f1',
  type: 'daily',
  xpReward: 50,
  currencyReward: 10,
  completionType: 'boolean',
  completed: true,
  followStreak: true,
  streakCount: 12,
  ...overrides,
});

describe('toFactionTemplate', () => {
  const quests = [
    quest({ linkedWeeklyQuestId: 'q-w' }),
    quest({ id: 'q-w', title: '3 sorties', type: 'weekly', completionType: 'progress', current: 2, target: 3, startingValue: 0, completed: false }),
    quest({ id: 'other', factionId: 'f2', title: 'Ailleurs' }),
  ];

  it("ne garde ni l'XP, ni le niveau, ni l'état des quêtes", () => {
    const template = toFactionTemplate(faction, quests, { description: 'Bouger', tags: ['sport'] });
    expect(template).not.toHaveProperty('renownLevel');
    expect(template).not.toHaveProperty('currentXP');
    expect(template.quests).toHaveLength(2);
    for (const q of template.quests) {
      expect(q).not.toHaveProperty('completed');
      expect(q).not.toHaveProperty('current');
      expect(q).not.toHaveProperty('streakCount');
      expect(q).not.toHaveProperty('id');
      expect(q).not.toHaveProperty('factionId');
    }
  });

  it('conserve le lien journalière → hebdo avec des clés locales', () => {
    const template = toFactionTemplate(faction, quests, { description: '', tags: ['sport'] });
    expect(template.quests[0].linkedWeeklyKey).toBe(template.quests[1].key);
    expect(template.quests[1].target).toBe(3);
  });

  it('coupe les textes trop longs', () => {
    const long = 'x'.repeat(500);
    const template = toFactionTemplate({ ...faction, name: long }, [quest({ title: long, description: long })], {
      description: long,
      tags: ['sport', 'health', 'mind', 'work'],
    });
    expect(template.name).toHaveLength(MARKETPLACE_LIMITS.factionName);
    expect(template.description).toHaveLength(MARKETPLACE_LIMITS.description);
    expect(template.quests[0].title).toHaveLength(MARKETPLACE_LIMITS.questTitle);
    expect(template.quests[0].description).toHaveLength(MARKETPLACE_LIMITS.questDescription);
    expect(template.tags).toHaveLength(MARKETPLACE_LIMITS.maxTags);
  });
});

describe('validateTemplate', () => {
  const base = toFactionTemplate(faction, [quest()], { description: '', tags: ['sport'] });

  it('accepte un modèle valide', () => {
    expect(validateTemplate(base)).toBeNull();
  });

  it('refuse un modèle sans thème ou sans quête', () => {
    expect(validateTemplate({ ...base, tags: [] })).toBe('tags');
    expect(validateTemplate({ ...base, quests: [] })).toBe('noQuests');
    expect(validateTemplate({ ...base, name: '  ' })).toBe('name');
  });
});

describe('instantiateTemplate', () => {
  it('crée une faction niveau 0 et des quêtes à zéro, liens recâblés', () => {
    const template = toFactionTemplate(
      faction,
      [
        quest({ linkedWeeklyQuestId: 'q-w' }),
        quest({ id: 'q-w', type: 'weekly', completionType: 'progress', current: 2, target: 3, startingValue: 1 }),
      ],
      { description: '', tags: ['sport'] }
    );
    const { faction: installed, quests } = instantiateTemplate(template, 1000);

    expect(installed).toMatchObject({ id: 'faction-1000', renownLevel: 0, currentXP: 0, name: 'Sport' });
    expect(quests[0]).toMatchObject({ factionId: 'faction-1000', completed: false, streakCount: 0, linkedWeeklyQuestId: quests[1].id });
    expect(quests[1]).toMatchObject({ current: 1, target: 3, completed: false });
  });
});

describe('PSEUDO_PATTERN / sanitizeSearch', () => {
  it('valide les pseudos', () => {
    expect(PSEUDO_PATTERN.test('Théo_42')).toBe(true);
    expect(PSEUDO_PATTERN.test('ab')).toBe(false);
    expect(PSEUDO_PATTERN.test('avec espace')).toBe(false);
  });

  it('retire les caractères spéciaux de PostgREST', () => {
    expect(sanitizeSearch(' sport,(santé)* ')).toBe('sport santé');
  });
});
