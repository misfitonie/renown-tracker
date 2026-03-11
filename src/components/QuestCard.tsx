import { Check, Plus, Gem, Pencil, Trash2 } from 'lucide-react';
import { Quest } from '../types';
import { isQuestCompleted } from '../utils/gameLogic';

interface QuestCardProps {
  quest: Quest;
  factionColor: string;
  onComplete: () => void;
  onIncrement?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function QuestCard({ quest, factionColor, onComplete, onIncrement, onEdit, onDelete }: QuestCardProps) {
  const completed = isQuestCompleted(quest);
  const progressPercentage = quest.completionType === 'progress' && quest.target
    ? ((quest.current || 0) / quest.target) * 100
    : 0;

  return (
    <div
      className={`bg-bg-card rounded-lg p-4 border-l-4 transition-all group ${
        completed ? 'opacity-50' : 'hover:translate-x-1'
      }`}
      style={{ borderLeftColor: completed ? '#666' : factionColor }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-white">{quest.title}</h4>
            {quest.type === 'weekly' && (
              <span className="text-xs bg-accent-purple px-2 py-0.5 rounded text-white">
                Hebdo
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mb-3">{quest.description}</p>

          {/* Barre de progression */}
          {quest.completionType === 'progress' && (
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Progression</span>
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

          {/* Récompenses */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-accent-gold">+{quest.xpReward} XP</span>
            <span className="flex items-center gap-1 text-accent-gold">
              <Gem size={14} />
              +{quest.currencyReward}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Boutons edit/delete (visibles au hover) */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className="text-gray-500 hover:text-white p-1.5 rounded transition-colors"
              title="Modifier"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={onDelete}
              className="text-gray-500 hover:text-red-400 p-1.5 rounded transition-colors"
              title="Supprimer"
            >
              <Trash2 size={15} />
            </button>
          </div>

          {/* Bouton de complétion */}
          {completed ? (
            <div className="bg-green-600/20 text-green-400 p-2 rounded-lg">
              <Check size={20} />
            </div>
          ) : quest.completionType === 'progress' ? (
            <button
              onClick={onIncrement}
              className="bg-accent-blue hover:bg-accent-blue/80 text-white p-2 rounded-lg transition-colors"
              title="Incrémenter"
            >
              <Plus size={20} />
            </button>
          ) : (
            <button
              onClick={onComplete}
              className="bg-accent-gold hover:bg-accent-gold/80 text-bg-dark font-bold px-4 py-2 rounded-lg transition-colors"
            >
              Valider
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
