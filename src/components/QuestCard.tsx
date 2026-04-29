import { useState, useEffect } from 'react';
import { Check, Plus, Gem, Pencil, Trash2, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Quest } from '../types';
import { isQuestCompleted } from '../utils/gameLogic';

interface QuestCardProps {
  quest: Quest;
  factionColor: string;
  onComplete: () => void;
  onUncomplete: () => void;
  onIncrement?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const TYPE_BADGE: Record<string, { key: string; color: string }> = {
  weekly:  { key: 'quest.weeklyBadge',  color: 'bg-accent-purple text-white' },
  monthly: { key: 'quest.monthlyBadge', color: 'bg-orange-500/80 text-white' },
  yearly:  { key: 'quest.yearlyBadge',  color: 'bg-yellow-500/80 text-bg-dark' },
};

export function QuestCard({ quest, factionColor, onComplete, onUncomplete, onIncrement, onEdit, onDelete }: QuestCardProps) {
  const { t } = useTranslation();
  const completed = isQuestCompleted(quest);
  const progressPercentage = quest.completionType === 'progress' && quest.target
    ? ((quest.current || 0) / quest.target) * 100
    : 0;

  const [isCollapsed, setIsCollapsed] = useState(completed);

  // Auto-repli à la complétion
  useEffect(() => {
    if (completed) setIsCollapsed(true);
  }, [completed]);

  const badge = TYPE_BADGE[quest.type];

  return (
    <div
      className={`bg-bg-card rounded-lg p-4 border-l-4 transition-all group ${
        completed ? 'opacity-50' : 'hover:translate-x-1'
      }`}
      style={{ borderLeftColor: completed ? '#666' : factionColor }}
    >
      {/* Ligne principale (toujours visible) */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h4 className="font-semibold text-white truncate">{quest.title}</h4>
          {badge && (
            <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${badge.color}`}>
              {t(badge.key)}
            </span>
          )}
          {quest.followStreak && (
            <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded flex items-center gap-1 flex-shrink-0">
              🔥 {quest.streakCount ?? 0}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Boutons edit/delete */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="text-gray-500 hover:text-white p-1.5 rounded transition-colors" title={t('common.edit')}>
              <Pencil size={15} />
            </button>
            <button onClick={onDelete} className="text-gray-500 hover:text-red-400 p-1.5 rounded transition-colors" title={t('common.delete')}>
              <Trash2 size={15} />
            </button>
          </div>

          {/* Chevron collapse */}
          <button
            onClick={() => setIsCollapsed(c => !c)}
            className="text-gray-600 hover:text-gray-400 p-1.5 rounded transition-colors"
          >
            <ChevronDown size={14} className={`transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
          </button>

          {/* Bouton de complétion */}
          {completed ? (
            <button
              onClick={onUncomplete}
              className="bg-green-600/20 hover:bg-red-900/30 text-green-400 hover:text-red-400 p-2 rounded-lg transition-colors"
              title={t('quest.button.uncomplete')}
            >
              <Check size={20} />
            </button>
          ) : quest.completionType === 'progress' ? (
            <button
              onClick={onIncrement}
              className="bg-accent-blue hover:bg-accent-blue/80 text-white p-2 rounded-lg transition-colors"
              title={t('quest.button.increment')}
            >
              <Plus size={20} />
            </button>
          ) : (
            <button
              onClick={onComplete}
              className="bg-accent-gold hover:bg-accent-gold/80 text-bg-dark font-bold px-4 py-2 rounded-lg transition-colors"
            >
              {t('quest.validate')}
            </button>
          )}
        </div>
      </div>

      {/* Corps (masqué quand replié) */}
      {!isCollapsed && (
        <div className="mt-3">
          {quest.description && (
            <p className="text-sm text-gray-400 mb-3">{quest.description}</p>
          )}

          {quest.completionType === 'progress' && (
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{t('quest.progressLabel')}</span>
                <span>{quest.current || 0} / {quest.target}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%`, backgroundColor: factionColor }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 text-sm">
            <span className="text-accent-gold">+{quest.xpReward} XP</span>
            <span className="flex items-center gap-1 text-accent-gold">
              <Gem size={14} />
              +{quest.currencyReward}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
