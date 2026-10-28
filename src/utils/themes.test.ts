import { describe, it, expect } from 'vitest';
import { normalizeThemeId } from './themes';

describe('normalizeThemeId', () => {
  it('garde les thèmes connus', () => {
    expect(normalizeThemeId('light')).toBe('light');
    expect(normalizeThemeId('dark')).toBe('dark');
  });

  it('migre les anciens thèmes sombres vers le thème sombre', () => {
    for (const legacy of ['ardoise', 'nuit', 'abyssal', 'braise', 'foret']) {
      expect(normalizeThemeId(legacy)).toBe('dark');
    }
  });

  it('utilise le thème sombre par défaut', () => {
    expect(normalizeThemeId(null)).toBe('dark');
  });
});
