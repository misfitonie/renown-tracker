import { useState } from 'react';
import { Plus, Pencil, Trash2, Download, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Player } from '../types';
import { PlayerFormModal, PlayerFormData } from './PlayerFormModal';

interface PlayerSelectScreenProps {
  players: Player[];
  onCreate: (data: PlayerFormData) => void;
  onEdit: (playerId: string, data: PlayerFormData) => void;
  onDelete: (playerId: string) => void;
  onSelect: (playerId: string) => void;
  onExport: (playerId: string) => void;
  onImport: () => void;
}

type ModalState =
  | { mode: 'create' }
  | { mode: 'edit'; player: Player };

export function PlayerSelectScreen({
  players,
  onCreate,
  onEdit,
  onDelete,
  onSelect,
  onExport,
  onImport,
}: PlayerSelectScreenProps) {
  const { t } = useTranslation();
  const [modal, setModal] = useState<ModalState | null>(null);

  const handleSave = (data: PlayerFormData) => {
    if (modal?.mode === 'edit') {
      onEdit(modal.player.id, data);
    } else {
      onCreate(data);
    }
    setModal(null);
  };

  const handleDelete = (player: Player) => {
    if (confirm(t('player.deleteConfirm', { name: player.name }))) {
      onDelete(player.id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-dark via-[#1a1430] to-bg-dark flex flex-col items-center justify-center p-8">
      {/* Gradient overlay */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,_rgba(157,78,221,0.1)_0%,_transparent_50%)]" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_80%_70%,_rgba(74,158,255,0.1)_0%,_transparent_50%)]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-title text-5xl text-accent-gold mb-3 tracking-wider drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]">
            RENOWN TRACKER
          </h1>
          <p className="text-gray-400 tracking-widest">
            {players.length === 0 ? t('player.emptyMessage') : t('player.chooseMessage')}
          </p>
        </div>

        {/* Grille des joueurs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          {players.map(player => (
            <div
              key={player.id}
              className="relative group cursor-pointer bg-bg-card rounded-xl p-6 border transition-all hover:-translate-y-1"
              style={{
                borderColor: `${player.color}44`,
                boxShadow: `0 4px 24px ${player.color}22`,
              }}
              onClick={() => onSelect(player.id)}
            >
              {/* Actions au survol */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => onExport(player.id)}
                  className="p-1.5 rounded-md bg-bg-dark hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                  title={t('app.settings.export')}
                >
                  <Download size={12} />
                </button>
                <button
                  onClick={() => setModal({ mode: 'edit', player })}
                  className="p-1.5 rounded-md bg-bg-dark hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => handleDelete(player)}
                  className="p-1.5 rounded-md bg-bg-dark hover:bg-red-900/40 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Contenu */}
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl border-2"
                  style={{ borderColor: player.color, backgroundColor: `${player.color}22` }}
                >
                  {player.emoji}
                </div>
                <span className="font-title text-white text-center">{player.name}</span>
              </div>
            </div>
          ))}

          {/* Nouveau profil */}
          <button
            onClick={() => setModal({ mode: 'create' })}
            className="flex flex-col items-center justify-center gap-2 bg-bg-card/40 rounded-xl p-6 border border-dashed border-gray-700 hover:border-gray-500 text-gray-600 hover:text-gray-400 transition-all hover:-translate-y-1"
          >
            <Plus size={28} />
            <span className="text-sm">{t('player.newProfile')}</span>
          </button>
        </div>

        {/* Import */}
        <div className="text-center">
          <button
            onClick={onImport}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors mx-auto"
          >
            <Upload size={14} />
            {t('player.importProfile')}
          </button>
        </div>
      </div>

      {modal && (
        <PlayerFormModal
          initialData={modal.mode === 'edit' ? modal.player : undefined}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
