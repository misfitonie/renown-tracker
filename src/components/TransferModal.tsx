import { useEffect, useState } from 'react';
import { X, UserRound, Flag, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Faction } from '../types';
import { IconImage } from './IconImage';

interface TransferModalProps {
  factions: Faction[];
  onProfile: () => void;
  onFaction: (faction: Faction) => void;
  onClose: () => void;
}

// Modale d'export : on choisit d'abord Profil ou Faction, puis la faction à exporter.
// (L'import ne concerne que les factions : un profil ne se remplace pas, il se crée à la première connexion.)
export function TransferModal({ factions, onProfile, onFaction, onClose }: TransferModalProps) {
  const { t } = useTranslation();
  const [pickFaction, setPickFaction] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const choices = [
    { key: 'profile', Icon: UserRound, onClick: onProfile, disabled: false },
    {
      key: 'faction',
      Icon: Flag,
      onClick: () => setPickFaction(true),
      disabled: factions.length === 0,
    },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative bg-bg-card border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {pickFaction && (
              <button onClick={() => setPickFaction(false)} className="text-gray-400 hover:text-white transition-colors" title={t('transfer.back')}>
                <ChevronLeft size={20} />
              </button>
            )}
            <h2 className="text-xl font-title text-accent-gold">
              {pickFaction ? t('transfer.chooseFaction') : t('transfer.export.title')}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {pickFaction ? (
          <ul className="space-y-2 overflow-y-auto -mx-2 px-2">
            {factions.map(faction => (
              <li key={faction.id}>
                <button
                  onClick={() => onFaction(faction)}
                  className="flex items-center gap-3 w-full p-3 rounded-lg border border-gray-700 bg-bg-dark hover:border-gray-500 transition-colors text-left"
                >
                  <IconImage image={faction.image} emoji={faction.icon} className="text-2xl leading-none" imageClassName="w-8 h-8" />
                  <span className="font-title text-white truncate flex-1">{faction.name}</span>
                  <span className="text-xs flex-shrink-0" style={{ color: faction.color }}>
                    {t('common.level')} {faction.renownLevel}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {choices.map(({ key, Icon, onClick, disabled }) => (
              <button
                key={key}
                onClick={onClick}
                disabled={disabled}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-700 bg-bg-dark hover:border-accent-purple transition-colors text-center disabled:opacity-40 disabled:hover:border-gray-700"
              >
                <Icon size={28} className="text-accent-purple" />
                <span className="font-title text-white">{t(`transfer.${key}`)}</span>
                <span className="text-xs text-gray-500">
                  {disabled ? t('transfer.noFaction') : t(`transfer.export.${key}Hint`)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
