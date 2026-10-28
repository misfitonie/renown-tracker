import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // NEXT_PUBLIC_ : noms créés par l'intégration Supabase de Vercel (valeurs publiques par conception)
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
})
