import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Player } from '../types';
import { ImageUploadField } from './ImageUploadField';
import { IconImage } from './IconImage';

export interface PlayerFormData {
  name: string;
  emoji: string;
  color: string;
  avatar?: string;
}

interface PlayerFormProps {
  initialData?: PlayerFormData;
  onSave: (data: PlayerFormData) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

// Formulaire du personnage : utilisé à la création (écran d'accueil) et en modale pour le modifier
export function PlayerForm({ initialData, onSave, onCancel, submitLabel }: PlayerFormProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<PlayerFormData>({
    name: initialData?.name ?? '',
    emoji: initialData?.emoji ?? '🧙',
    color: initialData?.color ?? '#9d4edd',
    avatar: initialData?.avatar,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  const inputClass =
    'w-full bg-bg-dark border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent-purple';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">{t('player.form.name')} *</label>
        <input
          type="text"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className={inputClass}
          placeholder={t('player.form.namePlaceholder')}
          required
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('player.form.emoji')}</label>
          <input
            type="text"
            value={form.emoji}
            onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
            className={inputClass}
            placeholder="🧙"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('player.form.color')}</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={form.color}
              onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
              className="w-10 h-10 rounded-lg border border-gray-700 bg-bg-dark cursor-pointer"
            />
            <span className="text-sm text-gray-400">{form.color}</span>
          </div>
        </div>
      </div>

      <ImageUploadField image={form.avatar} onChange={avatar => setForm(f => ({ ...f, avatar }))} />

      {/* Aperçu */}
      <div
        className="flex items-center gap-3 rounded-lg px-4 py-3 border"
        style={{ borderColor: `${form.color}44`, backgroundColor: `${form.color}11` }}
      >
        <IconImage image={form.avatar} emoji={form.emoji || '?'} className="text-3xl" imageClassName="w-9 h-9" />
        <span className="font-title text-base" style={{ color: form.color }}>
          {form.name || t('player.form.preview')}
        </span>
      </div>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-bg-dark hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg transition-colors border border-gray-700"
          >
            {t('common.cancel')}
          </button>
        )}
        <button
          type="submit"
          className="flex-1 bg-accent-purple hover:bg-accent-purple/80 text-on-accent font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {submitLabel ?? (initialData ? t('player.form.save') : t('player.form.create'))}
        </button>
      </div>
    </form>
  );
}

interface PlayerFormModalProps {
  initialData: Player;
  onSave: (data: PlayerFormData) => void;
  onClose: () => void;
}

export function PlayerFormModal({ initialData, onSave, onClose }: PlayerFormModalProps) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-bg-card border border-gray-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-title text-accent-gold">{t('player.editProfile')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <PlayerForm initialData={initialData} onSave={onSave} onCancel={onClose} />
      </div>
    </div>
  );
}
