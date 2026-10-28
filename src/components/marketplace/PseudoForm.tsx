import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MARKETPLACE_LIMITS, PSEUDO_PATTERN } from '../../utils/marketplace';
import { MarketplaceError, saveMyPseudo } from '../../lib/marketplace';

interface PseudoFormProps {
  userId: string;
  current: string | null;
  onSaved: (pseudo: string) => void;
  onCancel: () => void;
}

// Choix du pseudo public, affiché sur les factions publiées à la place de l'email
export function PseudoForm({ userId, current, onSaved, onCancel }: PseudoFormProps) {
  const { t } = useTranslation();
  const [pseudo, setPseudo] = useState(current ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = pseudo.trim();
    if (!PSEUDO_PATTERN.test(value)) {
      setError(t('marketplace.pseudo.invalid', { min: MARKETPLACE_LIMITS.pseudoMin, max: MARKETPLACE_LIMITS.pseudoMax }));
      return;
    }
    setSaving(true);
    try {
      await saveMyPseudo(userId, value, current !== null);
      onSaved(value);
    } catch (err) {
      const code = err instanceof MarketplaceError ? err.code : 'unknown';
      setError(t(code === 'pseudoTaken' ? 'marketplace.pseudo.taken' : `marketplace.error.${code}`));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="font-title text-lg text-white mb-1">{t('marketplace.pseudo.title')}</h3>
        <p className="text-sm text-gray-400">{t('marketplace.pseudo.hint')}</p>
      </div>
      <input
        type="text"
        value={pseudo}
        onChange={e => { setPseudo(e.target.value); setError(null); }}
        maxLength={MARKETPLACE_LIMITS.pseudoMax}
        placeholder={t('marketplace.pseudo.placeholder')}
        autoFocus
        className="w-full bg-bg-dark border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent-purple"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-bg-dark hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg transition-colors border border-gray-700"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-accent-purple hover:bg-accent-purple/80 text-on-accent font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {t('marketplace.pseudo.save')}
        </button>
      </div>
    </form>
  );
}
