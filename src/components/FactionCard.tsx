import { useState, useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
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
  const progressPercentage = (faction.currentXP / faction.xpToNextLevel) * 100;
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progressPercentage / 100) * circumference;

  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (levelUpTrigger === 0) return;
    setAnimating(true);
    const t = setTimeout(() => setAnimating(false), 850);
    return () => clearTimeout(t);
  }, [levelUpTrigger]);

  return (
    <div
      className={`relative flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all group ${
        animating ? 'animate-factionLevelUp' : ''
      }`}
      style={{
        '--fluc': `${faction.color}bb`,
        backgroundColor: selected ? `${faction.color}18` : 'var(--theme-card-bg)',
        borderColor: selected ? `${faction.color}88` : 'var(--theme-outline)',
        boxShadow: selected ? `0 0 12px ${faction.color}22` : 'none',
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
            strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s ease', filter: `drop-shadow(0 0 3px ${faction.color})` }}
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
            Niv.{faction.renownLevel}
          </span>
        </div>
        <div className="w-full bg-gray-700/50 rounded-full h-1 mt-1.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%`, backgroundColor: faction.color }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{faction.currentXP} / {faction.xpToNextLevel} XP</p>
      </div>

      {/* Boutons edit/delete */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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
