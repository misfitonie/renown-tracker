export interface Theme {
  id: string;
  label: string;
  bg: string;       // hex — fond de page
  cardBg: string;   // hex — fond des cards
  outline: string;  // hex — contours des cards
}

export const THEMES: Theme[] = [
  {
    id: 'ardoise',
    label: 'Ardoise',
    bg: '#18181A',
    cardBg: '#323336',
    outline: '#2d2e33',
  },
  {
    id: 'nuit',
    label: 'Nuit violette',
    bg: '#0a0e1a',
    cardBg: '#1a1f35',
    outline: '#2a3060',
  },
  {
    id: 'abyssal',
    label: 'Abyssal',
    bg: '#07070f',
    cardBg: '#111120',
    outline: '#1e1e38',
  },
  {
    id: 'braise',
    label: 'Terre brûlée',
    bg: '#100a05',
    cardBg: '#1f150a',
    outline: '#2e1e0e',
  },
  {
    id: 'foret',
    label: 'Forêt noire',
    bg: '#060f08',
    cardBg: '#0f1f12',
    outline: '#1a2e1e',
  },
];

export const DEFAULT_THEME_ID = 'ardoise';
