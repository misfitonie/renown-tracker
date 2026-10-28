import { useState } from 'react';
import { ChevronLeft, Check, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PlayerForm, PlayerFormData } from './PlayerFormModal';
import { AccountBar, AccountInfo } from './AccountBar';
import { AppFooter } from './AppFooter';
import { STARTER_FACTIONS, DEFAULT_STARTER_IDS } from '../utils/initialData';
import { MARKETPLACE_LIMITS, PSEUDO_PATTERN } from '../utils/marketplace';
import { MarketplaceError, fetchMyPseudo, saveMyPseudo } from '../lib/marketplace';

interface ProfileSetupScreenProps {
  onCreate: (data: PlayerFormData, starterIds: string[], lang: string) => void;
  account?: AccountInfo;
  userId?: string | null; // compte connecté : on choisit aussi son pseudo public
  loading?: boolean; // compte connecté : on ne sait pas encore si le compte a un personnage
  onRetry?: () => void; // compte connecté, serveur injoignable : nouvel essai
}

// Propose un pseudo à partir du nom du personnage (caractères autorisés seulement)
function suggestPseudo(name: string): string {
  return Array.from(name.trim().replace(/\s+/g, '_').replace(/[^\p{L}\p{N}_.-]/gu, ''))
    .slice(0, MARKETPLACE_LIMITS.pseudoMax)
    .join('');
}

// Premier lancement (ou première connexion d'un compte sans personnage) : création du personnage en deux étapes.
// C'est le seul endroit où un personnage est créé ; ensuite il se modifie depuis la carte joueur.
// 1. nom, emoji, couleur  2. factions de départ (et pseudo public pour un compte)
export function ProfileSetupScreen({ onCreate, account, userId = null, loading = false, onRetry }: ProfileSetupScreenProps) {
  const { t, i18n } = useTranslation();
  const [player, setPlayer] = useState<PlayerFormData | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [starterIds, setStarterIds] = useState<string[]>(DEFAULT_STARTER_IDS);
  const [pseudo, setPseudo] = useState('');
  const [existingPseudo, setExistingPseudo] = useState<string | null>(null);
  const [pseudoError, setPseudoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const lang = i18n.language.startsWith('en') ? 'en' : 'fr';

  const handlePlayer = (data: PlayerFormData) => {
    setPlayer(data);
    setStep(2);
    if (!userId) return;
    // Pseudo déjà choisi (ex. personnage recréé) : on le reprend, sinon on en propose un
    fetchMyPseudo(userId)
      .then(current => {
        setExistingPseudo(current);
        setPseudo(prev => prev || current || suggestPseudo(data.name));
      })
      .catch(() => setPseudo(prev => prev || suggestPseudo(data.name)));
  };

  const toggleStarter = (id: string) =>
    setStarterIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const handleStart = async () => {
    if (!player) return;
    if (userId) {
      const value = pseudo.trim();
      if (!PSEUDO_PATTERN.test(value)) {
        setPseudoError(t('marketplace.pseudo.invalid', { min: MARKETPLACE_LIMITS.pseudoMin, max: MARKETPLACE_LIMITS.pseudoMax }));
        return;
      }
      if (value !== existingPseudo) {
        setSaving(true);
        try {
          await saveMyPseudo(userId, value, existingPseudo !== null);
        } catch (err) {
          const code = err instanceof MarketplaceError ? err.code : 'unknown';
          // Hors ligne : on ne bloque pas la création, le pseudo sera redemandé à la première publication
          if (code !== 'offline') {
            setPseudoError(t(code === 'pseudoTaken' ? 'marketplace.pseudo.taken' : `marketplace.error.${code}`));
            setSaving(false);
            return;
          }
        }
        setSaving(false);
      }
    }
    onCreate(player, starterIds, lang);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-dark via-[var(--theme-glow)] to-bg-dark flex flex-col items-center justify-center p-8">
      {/* Gradient overlay */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,_rgba(157,78,221,0.1)_0%,_transparent_50%)]" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_80%_70%,_rgba(74,158,255,0.1)_0%,_transparent_50%)]" />
      </div>

      <div className={`relative z-10 w-full ${step === 2 ? 'max-w-lg' : 'max-w-sm'}`}>
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

        {loading && onRetry && (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">{t('player.loadError')}</p>
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 bg-bg-card hover:bg-bg-card/80 text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-colors border border-gray-700 text-sm"
            >
              <RefreshCw size={14} />
              {t('player.retry')}
            </button>
          </div>
        )}

        {!loading && step === 1 && (
          <div className="bg-bg-card border border-gray-700 rounded-xl p-6 shadow-2xl">
            <p className="text-sm text-gray-500 mb-4">{t('player.setupHint')}</p>
            <PlayerForm initialData={player ?? undefined} onSave={handlePlayer} submitLabel={t('player.setup.next')} />
          </div>
        )}

        {!loading && step === 2 && (
          <div className="bg-bg-card border border-gray-700 rounded-xl p-6 shadow-2xl space-y-5">
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
              <ChevronLeft size={16} />
              {t('transfer.back')}
            </button>

            {userId && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('marketplace.pseudo.title')} *</label>
                <input
                  type="text"
                  value={pseudo}
                  onChange={e => { setPseudo(e.target.value); setPseudoError(null); }}
                  maxLength={MARKETPLACE_LIMITS.pseudoMax}
                  placeholder={t('marketplace.pseudo.placeholder')}
                  className="w-full bg-bg-dark border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent-purple"
                />
                <p className={`text-xs mt-1 ${pseudoError ? 'text-red-400' : 'text-gray-500'}`}>
                  {pseudoError ?? t('marketplace.pseudo.hint')}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-400 mb-1">{t('player.setup.startersTitle')}</p>
              <p className="text-xs text-gray-500 mb-3">{t('player.setup.startersHint')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {STARTER_FACTIONS.map(starter => {
                  const selected = starterIds.includes(starter.id);
                  return (
                    <button
                      key={starter.id}
                      type="button"
                      onClick={() => toggleStarter(starter.id)}
                      aria-pressed={selected}
                      className="relative flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors"
                      style={{
                        borderColor: selected ? starter.color : 'rgb(var(--c-gray-700))',
                        backgroundColor: selected ? `${starter.color}1a` : 'transparent',
                      }}
                    >
                      <span className="text-xl leading-none">{starter.icon}</span>
                      <span className="text-sm text-white truncate">{starter.name[lang]}</span>
                      {selected && <Check size={12} className="absolute top-1 right-1" style={{ color: starter.color }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={saving}
              className="w-full bg-accent-purple hover:bg-accent-purple/80 text-on-accent font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {t('player.form.create')}
            </button>
          </div>
        )}
      </div>

      <AppFooter className="relative z-10 mt-12" />
    </div>
  );
}
