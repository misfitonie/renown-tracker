import { useState } from 'react';
import { Heart, Download, Flag, Trash2, Gem } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IconImage } from '../IconImage';
import { MARKETPLACE_LIMITS, SharedFaction } from '../../utils/marketplace';

interface MarketplaceDetailProps {
  faction: SharedFaction;
  isMine: boolean;
  liked: boolean;
  reported: boolean;
  canInteract: boolean; // compte connecté : peut aimer et signaler
  onInstall: () => void;
  onToggleLike: () => void;
  onReport: (reason: string) => void;
  onUnpublish: () => void;
}

const TYPE_ORDER = ['daily', 'weekly', 'monthly', 'yearly'] as const;

// Détail d'une faction publiée : ses quêtes, puis les actions (installer, aimer, signaler, dépublier)
export function MarketplaceDetail({
  faction,
  isMine,
  liked,
  reported,
  canInteract,
  onInstall,
  onToggleLike,
  onReport,
  onUnpublish,
}: MarketplaceDetailProps) {
  const { t, i18n } = useTranslation();
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('');

  const date = new Date(faction.createdAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <IconImage image={faction.image ?? undefined} emoji={faction.icon} className="text-4xl leading-none" imageClassName="w-12 h-12" />
        <div className="min-w-0 flex-1">
          <h3 className="font-title text-2xl break-words" style={{ color: faction.color }}>{faction.name}</h3>
          <p className="text-xs text-gray-500">{t('marketplace.byAuthor', { pseudo: faction.authorPseudo, date })}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {faction.tags.map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full border border-gray-700 text-gray-400">
                {t(`marketplace.tags.${tag}`)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {faction.hidden && <p className="text-sm text-orange-400">{t('marketplace.hiddenNotice')}</p>}
      {faction.description && <p className="text-sm text-gray-300 whitespace-pre-line break-words">{faction.description}</p>}

      <div className="space-y-3">
        {TYPE_ORDER.map(type => {
          const quests = faction.quests.filter(q => q.type === type);
          if (quests.length === 0) return null;
          return (
            <div key={type}>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                {t(`quest.section${type[0].toUpperCase()}${type.slice(1)}`)}
              </h4>
              <ul className="space-y-1.5">
                {quests.map(q => (
                  <li key={q.key} className="bg-bg-dark rounded-lg px-3 py-2 border-l-4" style={{ borderLeftColor: faction.color }}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-white break-words min-w-0">{q.title}</span>
                      <span className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
                        {q.completionType === 'progress' && <span>×{q.target}</span>}
                        <span>+{q.xpReward} {t('common.xp')}</span>
                        <span className="flex items-center gap-0.5 text-accent-gold"><Gem size={11} />{q.currencyReward}</span>
                      </span>
                    </div>
                    {q.description && <p className="text-xs text-gray-500 mt-0.5 break-words">{q.description}</p>}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-500">{t('marketplace.installHint')}</p>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onInstall}
          className="flex-1 flex items-center justify-center gap-2 bg-accent-purple hover:bg-accent-purple/80 text-on-accent font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Download size={16} />
          {t('marketplace.install')}
        </button>
        <button
          onClick={onToggleLike}
          disabled={!canInteract || isMine}
          title={!canInteract ? t('marketplace.signInToLike') : undefined}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border transition-colors disabled:opacity-50 ${
            liked ? 'border-pink-500/60 text-pink-400 bg-pink-500/10' : 'border-gray-700 text-gray-300 hover:border-gray-500'
          }`}
        >
          <Heart size={16} className={liked ? 'fill-current' : ''} />
          {faction.likesCount}
        </button>
      </div>

      <div className="flex justify-end border-t border-gray-700 pt-3">
        {isMine ? (
          <button onClick={onUnpublish} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors">
            <Trash2 size={12} />
            {t('marketplace.unpublish')}
          </button>
        ) : canInteract && !reported && !reporting ? (
          <button onClick={() => setReporting(true)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors">
            <Flag size={12} />
            {t('marketplace.report.button')}
          </button>
        ) : reported ? (
          <span className="text-xs text-gray-500">{t('marketplace.report.done')}</span>
        ) : null}
      </div>

      {reporting && (
        <form
          onSubmit={e => { e.preventDefault(); onReport(reason.trim()); setReporting(false); }}
          className="space-y-2"
        >
          <label className="block text-sm text-gray-400">{t('marketplace.report.reasonLabel')}</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            maxLength={MARKETPLACE_LIMITS.reportReason}
            rows={3}
            className="w-full bg-bg-dark border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-purple"
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setReporting(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">
              {t('common.cancel')}
            </button>
            <button type="submit" className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-on-accent rounded-lg">
              {t('marketplace.report.submit')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
