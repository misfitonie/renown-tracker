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
        'bg-dark': '#0a0e1a',
        'bg-card': '#1a1f35',
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
