import { Gem } from 'lucide-react';
import { Player } from '../types';

interface HeaderProps {
  currency: number;
  player: Player;
  onSwitchPlayer: () => void;
}

export function Header({ currency, player, onSwitchPlayer }: HeaderProps) {
  return (
    <header className="text-center mb-12">
      <h1 className="font-title text-5xl md:text-6xl text-accent-gold mb-4 tracking-wider drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]">
        RENOWN TRACKER
      </h1>
      <p className="text-gray-400 text-lg tracking-widest mb-6">
        Level Up Your Life
      </p>
      <div className="flex items-center justify-center gap-4">
        {/* Joueur actif */}
        <button
          onClick={onSwitchPlayer}
          className="flex items-center gap-2 bg-bg-card hover:bg-bg-card/80 border rounded-lg px-3 py-1.5 transition-colors"
          style={{ borderColor: `${player.color}44` }}
          title="Changer de profil"
        >
          <span className="text-lg">{player.emoji}</span>
          <span className="text-sm font-semibold" style={{ color: player.color }}>
            {player.name}
          </span>
        </button>

        {/* Currency */}
        <div className="flex items-center gap-2 text-2xl">
          <Gem className="text-accent-gold" size={28} />
          <span className="font-bold text-accent-gold">{currency}</span>
        </div>
      </div>
    </header>
  );
}
