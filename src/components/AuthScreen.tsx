import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Auth } from '../hooks/useAuth';
import { AppFooter } from './AppFooter';

type Mode = 'signIn' | 'signUp' | 'reset' | 'newPassword';

export function AuthScreen({ auth }: { auth: Auth }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>(auth.recovering ? 'newPassword' : 'signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'signIn') {
        const err = await auth.signInWithPassword(email, password);
        if (err) setError(t('auth.error.signIn'));
      } else if (mode === 'signUp') {
        const { error: err, needsConfirmation } = await auth.signUp(email, password);
        if (err) setError(err.message);
        else if (needsConfirmation) setInfo(t('auth.info.confirmEmail'));
      } else if (mode === 'reset') {
        const err = await auth.sendPasswordReset(email);
        if (err) setError(err.message);
        else setInfo(t('auth.info.resetSent'));
      } else {
        const err = await auth.updatePassword(password);
        if (err) setError(err.message);
      }
    } catch {
      setError(t('auth.error.network'));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    const err = await auth.signInWithGoogle();
    if (err) setError(err.message);
  };

  const inputClass =
    'w-full bg-bg-dark border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent-purple';

  const showPassword = mode !== 'reset';
  const showEmail = mode !== 'newPassword';

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-dark via-[var(--theme-glow)] to-bg-dark flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-title text-4xl sm:text-5xl text-accent-gold mb-3 tracking-wider drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]">
            RENOWN TRACKER
          </h1>
          <p className="text-gray-400 tracking-widest">{t(`auth.subtitle.${mode}`)}</p>
        </div>

        <div className="bg-bg-card border border-gray-700 rounded-xl p-6 shadow-2xl space-y-4">
          {(mode === 'signIn' || mode === 'signUp') && (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-700 bg-bg-dark hover:bg-white/5 text-white text-sm font-bold transition-colors"
              >
                <span className="font-title text-base">G</span>
                {t('auth.google')}
              </button>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <div className="flex-1 border-t border-gray-700" />
                {t('auth.or')}
                <div className="flex-1 border-t border-gray-700" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {showEmail && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('auth.email')}</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
            {showPassword && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  {mode === 'newPassword' ? t('auth.newPassword') : t('auth.password')}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}
            {info && <p className="text-sm text-green-400">{info}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full px-4 py-2.5 rounded-lg bg-accent-purple hover:opacity-90 text-on-accent text-sm font-bold transition-opacity disabled:opacity-50"
            >
              {t(`auth.submit.${mode}`)}
            </button>
          </form>

          <div className="flex flex-col items-center gap-1.5 text-sm">
            {mode === 'signIn' && (
              <>
                <button onClick={() => switchMode('signUp')} className="text-gray-400 hover:text-white transition-colors">
                  {t('auth.toSignUp')}
                </button>
                <button onClick={() => switchMode('reset')} className="text-gray-500 hover:text-gray-300 transition-colors text-xs">
                  {t('auth.forgotPassword')}
                </button>
              </>
            )}
            {(mode === 'signUp' || mode === 'reset') && (
              <button onClick={() => switchMode('signIn')} className="text-gray-400 hover:text-white transition-colors">
                {t('auth.toSignIn')}
              </button>
            )}
          </div>
        </div>

        {mode !== 'newPassword' && (
          <div className="text-center mt-6">
            <button
              onClick={() => auth.setGuest(true)}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              {t('auth.continueAsGuest')}
            </button>
            <p className="text-xs text-gray-600 mt-1">{t('auth.guestHint')}</p>
          </div>
        )}
      </div>

      <AppFooter className="relative z-10 mt-10" />
    </div>
  );
}
