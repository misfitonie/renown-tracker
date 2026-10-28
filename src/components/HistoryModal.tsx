import { X, Gem, CheckCircle2, Undo2, TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HistoryEntry } from '../types';

interface HistoryModalProps {
  history: HistoryEntry[];
  onClose: () => void;
}

const EVENT_STYLE: Record<HistoryEntry['type'], { Icon: typeof CheckCircle2; color: string }> = {
  quest_completed: { Icon: CheckCircle2, color: '#4ade80' },
  quest_uncompleted: { Icon: Undo2, color: '#9ca3af' },
  faction_level_up: { Icon: TrendingUp, color: '#facc15' },
  faction_level_down: { Icon: TrendingDown, color: '#f87171' },
  player_level_up: { Icon: TrendingUp, color: '#c084fc' },
  player_level_down: { Icon: TrendingDown, color: '#f87171' },
};

export function HistoryModal({ history, onClose }: HistoryModalProps) {
  const { t, i18n } = useTranslation();

  const dayLabel = (iso: string) => {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return t('history.today');
    if (date.toDateString() === yesterday.toDateString()) return t('history.yesterday');
    return date.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Regroupe les entrées par jour (l'historique est déjà trié du plus récent au plus ancien)
  const groups: { label: string; entries: HistoryEntry[] }[] = [];
  for (const entry of history) {
    const label = dayLabel(entry.at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.entries.push(entry);
    else groups.push({ label, entries: [entry] });
  }

  const describe = (entry: HistoryEntry) =>
    t(`history.${entry.type}`, { title: entry.questTitle, name: entry.factionName, level: entry.level });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-bg-card border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-title text-accent-gold">{t('history.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto -mx-2 px-2">
          {groups.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">{t('history.empty')}</p>
          )}
          {groups.map(group => (
            <div key={group.label} className="mb-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2 first-letter:uppercase">{group.label}</p>
              <ul className="space-y-1.5">
                {group.entries.map(entry => {
                  const { Icon, color } = EVENT_STYLE[entry.type];
                  const isQuest = entry.type === 'quest_completed' || entry.type === 'quest_uncompleted';
                  const sign = entry.type === 'quest_uncompleted' ? '−' : '+';
                  return (
                    <li key={entry.id} className="flex items-start gap-3 text-sm">
                      <Icon size={16} className="mt-0.5 flex-shrink-0" style={{ color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white break-words">{describe(entry)}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(entry.at).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                          {entry.factionName && isQuest && ` · ${entry.factionIcon ?? ''} ${entry.factionName}`}
                        </p>
                      </div>
                      {isQuest && (
                        <div className="text-xs text-right flex-shrink-0" style={{ color }}>
                          <p>{sign}{entry.xp} XP</p>
                          {!!entry.currency && (
                            <p className="flex items-center justify-end gap-1">
                              {sign}{entry.currency} <Gem size={11} />
                            </p>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
