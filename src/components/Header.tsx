import { Gem } from 'lucide-react';

interface HeaderProps {
  currency: number;
}

export function Header({ currency }: HeaderProps) {
  return (
    <header className="text-center mb-12">
      <h1 className="font-title text-5xl md:text-6xl text-accent-gold mb-4 tracking-wider drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]">
        RENOWN TRACKER
      </h1>
      <p className="text-gray-400 text-lg tracking-widest mb-6">
        Level Up Your Life
      </p>
      <div className="flex items-center justify-center gap-2 text-2xl">
        <Gem className="text-accent-gold" size={28} />
        <span className="font-bold text-accent-gold">{currency}</span>
      </div>
    </header>
  );
}
