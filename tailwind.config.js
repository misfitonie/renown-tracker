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
      },
      animation: {
        slideIn: 'slideIn 0.2s ease-out',
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
