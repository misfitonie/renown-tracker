import { useCallback, useEffect, useState } from 'react';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const GUEST_KEY = 'renown-tracker-guest';
// Dernier compte connecté : permet de rester connecté hors ligne même si le jeton a expiré
const LAST_USER_KEY = 'renown-tracker-last-user';

export interface AuthUser {
  id: string;
  email?: string;
}

function readLastUser(): AuthUser | null {
  try { return JSON.parse(localStorage.getItem(LAST_USER_KEY) ?? 'null'); } catch { return null; }
}

export type AuthStatus =
  | 'disabled'   // Supabase non configuré : mode local uniquement
  | 'loading'
  | 'signedOut'
  | 'signedIn';

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>(supabase ? 'loading' : 'disabled');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [guest, setGuestState] = useState(() => localStorage.getItem(GUEST_KEY) === '1');

  useEffect(() => {
    if (!supabase) return;

    const applySession = (sessionUser: AuthUser | null) => {
      if (sessionUser) {
        const next = { id: sessionUser.id, email: sessionUser.email };
        localStorage.setItem(LAST_USER_KEY, JSON.stringify(next));
        setUser(next);
        setStatus('signedIn');
      } else {
        localStorage.removeItem(LAST_USER_KEY);
        setUser(null);
        setStatus('signedOut');
      }
    };

    // getSession lit la session en cache. Hors ligne avec un jeton expiré, le rafraîchissement
    // échoue : on reste sur le dernier compte, la synchro reprendra au retour du réseau.
    supabase.auth.getSession().then(({ data, error }) => {
      const lastUser = readLastUser();
      if (!data.session && error && isAuthRetryableFetchError(error) && lastUser) {
        setUser(lastUser);
        setStatus('signedIn');
        return;
      }
      applySession(data.session?.user ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return; // déjà traité par getSession
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      applySession(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const setGuest = useCallback((value: boolean) => {
    if (value) localStorage.setItem(GUEST_KEY, '1');
    else localStorage.removeItem(GUEST_KEY);
    setGuestState(value);
  }, []);

  const redirectTo = window.location.origin;

  const signInWithGoogle = async () => {
    if (!supabase) return null;
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    return error;
  };

  const signInWithPassword = async (email: string, password: string) => {
    if (!supabase) return null;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error;
  };

  // Renvoie needsConfirmation si Supabase exige la validation de l'email
  const signUp = async (email: string, password: string) => {
    if (!supabase) return { error: null, needsConfirmation: false };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });
    return { error, needsConfirmation: !error && !data.session };
  };

  const sendPasswordReset = async (email: string) => {
    if (!supabase) return null;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return error;
  };

  const updatePassword = async (password: string) => {
    if (!supabase) return null;
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setRecovering(false);
    return error;
  };

  const signOut = async () => {
    if (!supabase) return;
    // scope local : déconnecte cet appareil même hors ligne
    await supabase.auth.signOut({ scope: 'local' });
  };

  return {
    enabled: status !== 'disabled',
    status,
    user,
    recovering,
    guest,
    setGuest,
    signInWithGoogle,
    signInWithPassword,
    signUp,
    sendPasswordReset,
    updatePassword,
    signOut,
  };
}

export type Auth = ReturnType<typeof useAuth>;
