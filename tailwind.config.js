/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        factionLevelUp: {
          '0%':   { transform: 'scale(1)' },
          '20%':  { transform: 'scale(1.06)', boxShadow: '0 0 32px var(--fluc)' },
          '60%':  { transform: 'scale(1.02)', boxShadow: '0 0 16px var(--fluc)' },
          '100%': { transform: 'scale(1)',    boxShadow: '0 0 0px transparent' },
        },
        xpSurge: {
          '0%':   { filter: 'brightness(1)' },
          '35%':  { filter: 'brightness(2)' },
          '100%': { filter: 'brightness(1)' },
        },
      },
      animation: {
        slideIn:         'slideIn 0.2s ease-out',
        factionLevelUp:  'factionLevelUp 0.85s ease-out forwards',
        xpSurge:         'xpSurge 0.6s ease-out',
      },
      colors: {
        'bg-dark': 'rgb(var(--color-bg-dark) / <alpha-value>)',
        'bg-card': 'rgb(var(--color-bg-card) / <alpha-value>)',
        'accent-gold': '#d4af37',
        'accent-blue': '#4a9eff',
        'accent-purple': '#9d4edd',
      },
      fontFamily: {
        'title': ['Cinzel', 'serif'],
        'body': ['Barlow', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
