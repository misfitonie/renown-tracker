import { Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PlayerForm, PlayerFormData } from './PlayerFormModal';
import { AccountBar, AccountInfo } from './AccountBar';
import { AppFooter } from './AppFooter';

interface ProfileSetupScreenProps {
  onCreate: (data: PlayerFormData) => void;
  onImport: () => void;
  account?: AccountInfo;
  loading?: boolean; // compte connecté : personnage en cours de récupération
}

// Premier lancement (ou compte sans personnage) : création du personnage
export function ProfileSetupScreen({ onCreate, onImport, account, loading = false }: ProfileSetupScreenProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-dark via-[var(--theme-glow)] to-bg-dark flex flex-col items-center justify-center p-8">
      {/* Gradient overlay */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,_rgba(157,78,221,0.1)_0%,_transparent_50%)]" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_80%_70%,_rgba(74,158,255,0.1)_0%,_transparent_50%)]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {account && (
          <AccountBar
            account={account}
            className="mb-8 bg-bg-card/60 border border-gray-700 rounded-lg px-3 py-2"
          />
        )}

        <div className="text-center mb-8">
          <h1 className="font-title text-5xl text-accent-gold mb-3 tracking-wider drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]">
            RENOWN TRACKER
          </h1>
          <p className="text-gray-400 tracking-widest">
            {loading ? t('player.loading') : t('player.setupTitle')}
          </p>
        </div>

        {!loading && (
          <>
            <div className="bg-bg-card border border-gray-700 rounded-xl p-6 shadow-2xl mb-6">
              <p className="text-sm text-gray-500 mb-4">{t('player.setupHint')}</p>
              <PlayerForm onSave={onCreate} />
            </div>

            <div className="text-center">
              <button
                onClick={onImport}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors mx-auto"
              >
                <Upload size={14} />
                {t('player.importProfile')}
              </button>
            </div>
          </>
        )}
      </div>

      <AppFooter className="relative z-10 mt-12" />
    </div>
  );
}
