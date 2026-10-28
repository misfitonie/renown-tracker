import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env = import.meta.env;
// Noms acceptés : ceux du guide (VITE_*), l'ancienne clé anon, et ceux de l'intégration Supabase de Vercel
const url = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) console.info('[renown-tracker] Supabase non configuré : mode local uniquement');

// Sans variables d'environnement (dev local, CI), l'app reste en mode local uniquement
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

export const PLAYERS_TABLE = 'players';
