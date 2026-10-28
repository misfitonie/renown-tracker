import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Faction, Quest } from '../../types';
import { IconImage } from '../IconImage';
import { TagChips } from './TagChips';
import { MARKETPLACE_LIMITS, MarketplaceTag, TemplateError, toFactionTemplate, validateTemplate, FactionTemplate } from '../../utils/marketplace';

interface MarketplacePublishProps {
  factions: Faction[];
  quests: Quest[];
  initialFactionId?: string;
  pseudo: string;
  publishing: boolean;
  onPublish: (template: FactionTemplate) => void;
  onEditPseudo: () => void;
}

// Publication d'une de ses factions : choix de la faction, description et thèmes
export function MarketplacePublish({ factions, quests, initialFactionId, pseudo, publishing, onPublish, onEditPseudo }: MarketplacePublishProps) {
  const { t } = useTranslation();
  const [factionId, setFactionId] = useState(initialFactionId ?? factions[0]?.id ?? '');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<MarketplaceTag[]>([]);
  const [error, setError] = useState<TemplateError | null>(null);

  const faction = factions.find(f => f.id === factionId);
  if (!faction) return <p className="text-sm text-gray-500">{t('transfer.noFaction')}</p>;

  const questCount = quests.filter(q => q.factionId === faction.id).length;

  const toggleTag = (tag: MarketplaceTag) =>
    setTags(prev => (prev.includes(tag) ? prev.filter(x => x !== tag) : [...prev, tag]));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const template = toFactionTemplate(faction, quests, { description, tags });
    const problem = validateTemplate(template);
    setError(problem);
    if (!problem) onPublish(template);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">{t('marketplace.publish.factionLabel')}</label>
        <div className="flex items-center gap-2">
          <IconImage image={faction.image} emoji={faction.icon} className="text-2xl leading-none" imageClassName="w-8 h-8" />
          <select
            value={factionId}
            onChange={e => { setFactionId(e.target.value); setError(null); }}
            className="flex-1 bg-bg-dark border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent-purple"
          >
            {factions.map(f => (
              <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
            ))}
          </select>
        </div>
        <p className="text-xs text-gray-500 mt-1">{t('marketplace.publish.questCount', { count: questCount })}</p>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">{t('marketplace.publish.descriptionLabel')}</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxLength={MARKETPLACE_LIMITS.description}
          rows={3}
          placeholder={t('marketplace.publish.descriptionPlaceholder')}
          className="w-full bg-bg-dark border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-purple"
        />
        <p className="text-xs text-gray-500 text-right">{description.length} / {MARKETPLACE_LIMITS.description}</p>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1.5">
          {t('marketplace.publish.tagsLabel', { max: MARKETPLACE_LIMITS.maxTags })}
        </label>
        <TagChips selected={tags} onToggle={toggleTag} disabled={() => tags.length >= MARKETPLACE_LIMITS.maxTags} />
      </div>

      <div className="text-xs text-gray-500 space-y-1 bg-bg-dark rounded-lg p-3 border border-gray-700">
        <p>{t('marketplace.publish.privacy')}</p>
        <p>
          {t('marketplace.publish.asPseudo', { pseudo })}{' '}
          <button type="button" onClick={onEditPseudo} className="underline hover:text-white">
            {t('marketplace.pseudo.change')}
          </button>
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-400">
          {t(`marketplace.publish.errors.${error}`, { max: MARKETPLACE_LIMITS.maxQuests })}
        </p>
      )}

      <button
        type="submit"
        disabled={publishing}
        className="w-full bg-accent-purple hover:bg-accent-purple/80 text-on-accent font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {t('marketplace.publish.submit')}
      </button>
    </form>
  );
}
