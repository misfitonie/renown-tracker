import { useState, useLayoutEffect } from 'react';
import { ThemeId, normalizeThemeId } from '../utils/themes';

const THEME_KEY = 'renown-tracker-theme';

export function useTheme() {
  const [themeId, setThemeId] = useState<ThemeId>(
    () => normalizeThemeId(localStorage.getItem(THEME_KEY))
  );

  // Layout effect : le thème est appliqué avant le premier rendu à l'écran (pas de flash).
  // Les couleurs elles-mêmes sont définies dans index.css selon data-theme.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = themeId;
    localStorage.setItem(THEME_KEY, themeId);
  }, [themeId]);

  return { themeId, setThemeId };
}
