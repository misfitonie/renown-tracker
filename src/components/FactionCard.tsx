import { useState, useEffect, useRef } from 'react';
import { Pencil, Trash2, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Faction } from '../types';

interface FactionCardProps {
  faction: Faction;
  selected: boolean;
  levelUpTrigger?: number;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function FactionCard({ faction, selected, levelUpTrigger = 0, onClick, onEdit, onDelete }: FactionCardProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: faction.id });
  const progressPercentage = (faction.currentXP / faction.xpToNextLevel) * 100;
  const radius = 22;
  const circumference = 2 * Math.PI * radius;

  const [animating, setAnimating] = useState(false);
  const [displayPercent, setDisplayPercent] = useState(progressPercentage);
  const [noTransition, setNoTransition] = useState(false);
  const animatingRef = useRef(false);
  const progressRef = useRef(progressPercentage);
  progressRef.current = progressPercentage;

  // Mise à jour normale (gain XP sans level-up)
  useEffect(() => {
    if (animatingRef.current) return;
    setDisplayPercent(progressPercentage);
  }, [progressPercentage]);

  // Animation level-up : remplir → reset → remplir
  useEffect(() => {
    if (levelUpTrigger === 0) return;

    animatingRef.current = true;
    setAnimating(true);
    const t1 = setTimeout(() => setAnimating(false), 850);

    // Phase 1 : remplir jusqu'à 100%
    setNoTransition(false);
    setDisplayPercent(100);

    const t2 = setTimeout(() => {
      // Phase 2 : reset instantané à 0
      setNoTransition(true);
      setDisplayPercent(0);

      requestAnimationFrame(() => requestAnimationFrame(() => {
        // Phase 3 : remplir vers la nouvelle valeur
        setNoTransition(false);
        setDisplayPercent(progressRef.current);
        setTimeout(() => { animatingRef.current = false; }, 600);
      }));
    }, 550);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [levelUpTrigger]);

  const displayOffset = circumference - (displayPercent / 100) * circumference;

  return (
    <div
      ref={setNodeRef}
      className={`relative flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all group ${
        animating ? 'animate-factionLevelUp' : ''
      }`}
      style={{
        '--fluc': `${faction.color}bb`,
        backgroundColor: selected ? `${faction.color}18` : 'var(--theme-card-bg)',
        borderColor: selected ? `${faction.color}88` : 'var(--theme-outline)',
        boxShadow: selected ? `0 0 12px ${faction.color}22` : 'none',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      } as React.CSSProperties}
      onClick={onClick}
    >
      {/* Anneau compact */}
      <div className="relative w-14 h-14 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 52 52">
          <circle cx="26" cy="26" r={radius} fill="none" stroke="var(--theme-outline)" strokeWidth="4" />
          <circle
            cx="26" cy="26" r={radius} fill="none"
            stroke={faction.color} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={displayOffset}
            style={{
              transition: noTransition ? 'none' : 'stroke-dashoffset 0.5s ease',
              filter: `drop-shadow(0 0 3px ${faction.color})`
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl leading-none">{faction.icon}</span>
        </div>
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-title text-white text-base truncate">{faction.name}</h3>
          <span className="text-sm font-bold flex-shrink-0" style={{ color: faction.color }}>
            {t('common.level')}{faction.renownLevel}
          </span>
        </div>
        <div className="w-full bg-gray-700/50 rounded-full h-1 mt-1.5 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${displayPercent}%`,
              backgroundColor: faction.color,
              transition: noTransition ? 'none' : 'width 0.5s ease',
            }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{faction.currentXP} / {faction.xpToNextLevel} {t('common.xp')}</p>
      </div>

      {/* Boutons edit/delete + drag handle */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          {...attributes}
          {...listeners}
          onClick={e => e.stopPropagation()}
          className="p-1.5 rounded-md bg-bg-dark hover:bg-gray-700 text-gray-400 hover:text-white transition-colors cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={12} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onEdit(); }}
          className="p-1.5 rounded-md bg-bg-dark hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded-md bg-bg-dark hover:bg-red-900/40 text-gray-400 hover:text-red-400 transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
