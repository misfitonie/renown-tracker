import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // NEXT_PUBLIC_ : noms créés par l'intégration Supabase de Vercel (valeurs publiques par conception)
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    // Fourni par Vercel au build (absent en local)
    __APP_COMMIT__: JSON.stringify((process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7)),
  },
})
