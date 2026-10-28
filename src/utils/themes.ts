export type ThemeId = 'dark' | 'light';

export const THEME_IDS: ThemeId[] = ['dark', 'light'];

export const DEFAULT_THEME_ID: ThemeId = 'dark';

// Les anciens thèmes (ardoise, nuit, abyssal, braise, foret) étaient tous sombres :
// toute valeur sauvegardée autre que 'light' bascule sur le thème sombre.
export function normalizeThemeId(saved: string | null): ThemeId {
  return saved === 'light' ? 'light' : DEFAULT_THEME_ID;
}
