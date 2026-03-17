import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Faction } from '../types';

export interface FactionFormData {
  name: string;
  icon: string;
  color: string;
}

interface FactionFormModalProps {
  initialData?: Faction;
  onSave: (data: FactionFormData) => void;
  onClose: () => void;
}

export function FactionFormModal({ initialData, onSave, onClose }: FactionFormModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FactionFormData>({
    name: initialData?.name ?? '',
    icon: initialData?.icon ?? '⚔️',
    color: initialData?.color ?? '#9d4edd',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  const inputClass =
    'w-full bg-bg-dark border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent-purple';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-bg-card border border-gray-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-title text-accent-gold">
            {initialData ? t('faction.modal.titleEdit') : t('faction.modal.titleCreate')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('faction.modal.nameLabel')}</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={inputClass}
              placeholder={t('faction.modal.namePlaceholder')}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('faction.modal.iconLabel')}</label>
              <input
                type="text"
                value={form.icon}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                className={inputClass}
                placeholder="🎨"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('faction.modal.colorLabel')}</label>
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

          {/* Aperçu */}
          <div className="flex items-center gap-3 bg-bg-dark rounded-lg px-4 py-3 border border-gray-700">
            <span className="text-2xl">{form.icon || '?'}</span>
            <span className="font-title text-base" style={{ color: form.color }}>
              {form.name || t('faction.modal.previewLabel')}
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-bg-dark hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg transition-colors border border-gray-700"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 bg-accent-purple hover:bg-accent-purple/80 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {initialData ? t('common.edit') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
