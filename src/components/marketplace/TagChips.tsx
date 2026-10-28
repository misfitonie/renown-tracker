import { useTranslation } from 'react-i18next';
import { MARKETPLACE_TAGS, MarketplaceTag } from '../../utils/marketplace';

interface TagChipsProps {
  selected: MarketplaceTag[];
  onToggle: (tag: MarketplaceTag) => void;
  disabled?: (tag: MarketplaceTag) => boolean;
}

// Liste des thèmes, sélectionnables (filtre de recherche ou thèmes d'une publication)
export function TagChips({ selected, onToggle, disabled }: TagChipsProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-1.5">
      {MARKETPLACE_TAGS.map(tag => {
        const active = selected.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
            disabled={!active && disabled?.(tag)}
            className={`px-2.5 py-1 text-xs rounded-full border transition-colors disabled:opacity-40 ${
              active
                ? 'border-accent-purple bg-accent-purple/20 text-white'
                : 'border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            {t(`marketplace.tags.${tag}`)}
          </button>
        );
      })}
    </div>
  );
}
