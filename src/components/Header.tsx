import { useState, useEffect, useRef } from 'react';
import { Gem } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Player } from '../types';
import { getXPForNextLevel } from '../utils/gameLogic';

interface HeaderProps {
  currency: number;
  player: Player;
  playerXP: number;
  playerLevel: number;
  onSwitchPlayer: () => void;
}

export function Header({ currency, player, playerXP, playerLevel, onSwitchPlayer }: HeaderProps) {
  const { t } = useTranslation();
  const xpToNext = getXPForNextLevel(playerLevel);
  const xpPercent = (playerXP / xpToNext) * 100;

  const [displayPercent, setDisplayPercent] = useState(xpPercent);
  const [noTransition, setNoTransition] = useState(false);
  const prevLevel = useRef(playerLevel);
  const animatingRef = useRef(false);
  const xpPercentRef = useRef(xpPercent);
  xpPercentRef.current = xpPercent;

  useEffect(() => {
    if (animatingRef.current) return;

    if (playerLevel > prevLevel.current) {
      animatingRef.current = true;
      prevLevel.current = playerLevel;

      // Phase 1 : remplir jusqu'à 100%
      setNoTransition(false);
      setDisplayPercent(100);

      const t = setTimeout(() => {
        // Phase 2 : reset instantané à 0
        setNoTransition(true);
        setDisplayPercent(0);

        requestAnimationFrame(() => requestAnimationFrame(() => {
          // Phase 3 : remplir vers la nouvelle valeur
          setNoTransition(false);
          setDisplayPercent(xpPercentRef.current);
          setTimeout(() => { animatingRef.current = false; }, 600);
        }));
      }, 550);

      return () => clearTimeout(t);
    }

    prevLevel.current = playerLevel;
    setDisplayPercent(xpPercent);
  }, [playerXP, playerLevel, xpPercent]);

  return (
    <header className="mb-24">
      <div className="flex justify-center mb-10">
      <button
        onClick={onSwitchPlayer}
        className="flex items-center gap-6 px-8 py-5 rounded-2xl border transition-all hover:brightness-110"
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: `${player.color}55`,
          boxShadow: `0 0 24px ${player.color}18`,
        }}
        title={t('player.switchProfile')}
      >
        <span className="text-5xl leading-none">{player.emoji}</span>

        <div className="min-w-[260px] text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="font-title text-white text-2xl leading-none">{player.name}</span>
            <span className="text-base font-bold ml-4" style={{ color: player.color }}>
              {t('common.level')} {playerLevel}
            </span>
          </div>
          <div className="w-full bg-gray-700/40 rounded-full h-2 overflow-hidden mb-1.5">
            <div
              className="h-full rounded-full"
              style={{
                width: `${displayPercent}%`,
                backgroundColor: player.color,
                transition: noTransition ? 'none' : 'width 0.5s ease',
              }}
            />
          </div>
          <p className="text-sm text-gray-500">
            {playerXP} / {xpToNext} {t('common.xp')}
          </p>
        </div>

        <div
          className="flex items-center gap-2 pl-6 border-l"
          style={{ borderColor: 'var(--theme-outline)' }}
        >
          <Gem size={20} className="text-accent-gold" />
          <span className="font-bold text-2xl text-accent-gold">{currency}</span>
        </div>
      </button>
      </div>

      {/* Séparateur RPG */}
      <div className="relative flex items-center gap-4 px-8">
        <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, ${player.color}88)` }} />
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: player.color }} />
          <div className="w-2.5 h-2.5 rotate-45 border" style={{ borderColor: player.color }} />
          <div className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: player.color }} />
        </div>
        <div className="h-px flex-1" style={{ background: `linear-gradient(to left, transparent, ${player.color}88)` }} />
      </div>
    </header>
  );
}
