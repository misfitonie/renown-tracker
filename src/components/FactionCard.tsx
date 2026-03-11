import { Pencil, Trash2 } from 'lucide-react';
import { Faction } from '../types';

interface FactionCardProps {
  faction: Faction;
  onEdit: () => void;
  onDelete: () => void;
}

export function FactionCard({ faction, onEdit, onDelete }: FactionCardProps) {
  const progressPercentage = (faction.currentXP / faction.xpToNextLevel) * 100;

  // Cercle SVG
  const radius = 44;
  const circumference = 2 * Math.PI * radius; // ~276.5
  const offset = circumference - (progressPercentage / 100) * circumference;

  return (
    <div
      className="relative flex flex-col items-center gap-3 bg-bg-card rounded-xl p-5 border border-gray-700 hover:border-opacity-80 transition-all hover:-translate-y-1 group"
      style={{
        boxShadow: `0 4px 24px ${faction.color}22`,
        borderColor: `${faction.color}44`,
      }}
    >
      {/* Boutons edit/delete */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-md bg-bg-dark hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-md bg-bg-dark hover:bg-red-900/40 text-gray-400 hover:text-red-400 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Anneau de progression circulaire */}
      <div className="relative w-28 h-28">
        <svg
          className="w-full h-full -rotate-90"
          viewBox="0 0 100 100"
        >
          {/* Piste de fond */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#2a2f45"
            strokeWidth="7"
          />
          {/* Arc de progression */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={faction.color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 0.5s ease',
              filter: `drop-shadow(0 0 6px ${faction.color})`,
            }}
          />
        </svg>

        {/* Icône + niveau au centre */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl leading-none">{faction.icon}</span>
          <span
            className="text-xs font-bold mt-1"
            style={{ color: faction.color }}
          >
            Niv. {faction.renownLevel}
          </span>
        </div>
      </div>

      {/* Nom + XP */}
      <div className="text-center">
        <h3 className="text-base font-title text-white leading-tight">{faction.name}</h3>
        <p className="text-xs text-gray-500 mt-1">
          {faction.currentXP} / {faction.xpToNextLevel} XP
        </p>
      </div>
    </div>
  );
}
