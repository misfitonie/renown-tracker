import { useState, useEffect } from 'react';
import { THEMES, DEFAULT_THEME_ID, Theme } from '../utils/themes';

const THEME_KEY = 'renown-tracker-theme';

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
}

export function useTheme() {
  const [themeId, setThemeIdState] = useState<string>(
    () => localStorage.getItem(THEME_KEY) ?? DEFAULT_THEME_ID
  );

  const theme: Theme = THEMES.find(t => t.id === themeId) ?? THEMES[0];

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-bg', theme.bg);
    root.style.setProperty('--theme-card-bg', theme.cardBg);
    root.style.setProperty('--theme-outline', theme.outline);
    // Variables RGB pour les modificateurs d'opacité Tailwind
    root.style.setProperty('--color-bg-dark', hexToRgb(theme.bg));
    root.style.setProperty('--color-bg-card', hexToRgb(theme.cardBg));
    localStorage.setItem(THEME_KEY, themeId);
  }, [themeId, theme]);

  const setThemeId = (id: string) => setThemeIdState(id);

  return { theme, themeId, setThemeId };
}
