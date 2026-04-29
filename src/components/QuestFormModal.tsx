import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Quest, Faction, FactionId, QuestType, CompletionType } from '../types';

export interface QuestFormData {
  title: string;
  description: string;
  factionId: FactionId;
  type: QuestType;
  completionType: CompletionType;
  target: number;
  startingValue: number;
  xpReward: number;
  currencyReward: number;
  followStreak: boolean;
  linkedWeeklyQuestId?: string;
}

interface QuestFormModalProps {
  initialData?: Quest;
  defaultFactionId?: FactionId;
  factions: Faction[];
  quests: Quest[];
  onSave: (data: QuestFormData) => void;
  onClose: () => void;
}

export function QuestFormModal({ initialData, defaultFactionId, factions, quests, onSave, onClose }: QuestFormModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<QuestFormData>({
    title: initialData?.title ?? '',
    description: initialData?.description ?? '',
    factionId: initialData?.factionId ?? defaultFactionId ?? factions[0].id,
    type: initialData?.type ?? 'daily',
    completionType: initialData?.completionType ?? 'boolean',
    target: initialData?.target ?? 5,
    startingValue: initialData?.startingValue ?? 0,
    xpReward: initialData?.xpReward ?? 50,
    currencyReward: initialData?.currencyReward ?? 10,
    followStreak: initialData?.followStreak ?? false,
    linkedWeeklyQuestId: initialData?.linkedWeeklyQuestId ?? '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave(form);
  };

  const inputClass =
    'w-full bg-bg-dark border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent-purple';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-bg-card border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-title text-accent-gold">
            {initialData ? t('quest.modal.titleEdit') : t('quest.modal.titleCreate')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Titre */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('quest.modal.titleLabel')}</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className={inputClass}
              placeholder={t('quest.modal.titlePlaceholder')}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('quest.modal.descriptionLabel')}</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className={inputClass}
              placeholder={t('quest.modal.descriptionPlaceholder')}
            />
          </div>

          {/* Faction + Fréquence */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('quest.modal.factionLabel')}</label>
              <select
                value={form.factionId}
                onChange={e => setForm(f => ({ ...f, factionId: e.target.value as FactionId }))}
                className={inputClass}
              >
                {factions.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.icon} {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('quest.modal.frequencyLabel')}</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as QuestType }))}
                className={inputClass}
              >
                <option value="daily">{t('quest.modal.daily')}</option>
                <option value="weekly">{t('quest.modal.weekly')}</option>
                <option value="monthly">{t('quest.modal.monthly')}</option>
                <option value="yearly">{t('quest.modal.yearly')}</option>
              </select>
            </div>
          </div>

          {/* Type de complétion */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('quest.modal.completionTypeLabel')}</label>
            <select
              value={form.completionType}
              onChange={e => setForm(f => ({ ...f, completionType: e.target.value as CompletionType }))}
              className={inputClass}
            >
              <option value="boolean">{t('quest.modal.typeBoolean')}</option>
              <option value="progress">{t('quest.modal.typeProgress')}</option>
            </select>
          </div>

          {/* Objectif + valeur de départ (progress uniquement) */}
          {form.completionType === 'progress' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('quest.modal.targetLabel')}</label>
                <input
                  type="number"
                  min={1}
                  value={form.target}
                  onChange={e => setForm(f => ({ ...f, target: Math.max(1, parseInt(e.target.value) || 1), startingValue: Math.min(f.startingValue, Math.max(1, parseInt(e.target.value) || 1) - 1) }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('quest.modal.startingValueLabel')}</label>
                <input
                  type="number"
                  min={0}
                  max={form.target - 1}
                  value={form.startingValue}
                  onChange={e => setForm(f => ({ ...f, startingValue: Math.min(Math.max(0, parseInt(e.target.value) || 0), f.target - 1) }))}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* Récompenses */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('common.xp')}</label>
              <input
                type="number"
                min={0}
                value={form.xpReward}
                onChange={e => setForm(f => ({ ...f, xpReward: Math.max(0, parseInt(e.target.value) || 0) }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('common.gems')}</label>
              <input
                type="number"
                min={0}
                value={form.currencyReward}
                onChange={e => setForm(f => ({ ...f, currencyReward: Math.max(0, parseInt(e.target.value) || 0) }))}
                className={inputClass}
              />
            </div>
          </div>

          {/* Lien quête hebdo (journalières uniquement) */}
          {form.type === 'daily' && (() => {
            const linkable = quests.filter(
              q => q.factionId === form.factionId && q.type === 'weekly' && q.completionType === 'progress'
            );
            if (linkable.length === 0) return null;
            return (
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('quest.modal.linkWeeklyLabel')}</label>
                <select
                  value={form.linkedWeeklyQuestId ?? ''}
                  onChange={e => setForm(f => ({ ...f, linkedWeeklyQuestId: e.target.value || undefined }))}
                  className={inputClass}
                >
                  <option value="">{t('quest.modal.noLink')}</option>
                  {linkable.map(q => (
                    <option key={q.id} value={q.id}>{q.title}</option>
                  ))}
                </select>
              </div>
            );
          })()}

          {/* Streak */}
          <div className="flex items-center justify-between bg-bg-dark border border-gray-700 rounded-lg px-3 py-2">
            <div>
              <p className="text-sm text-white">{t('quest.modal.streakLabel')}</p>
              <p className="text-xs text-gray-500">{t('quest.modal.streakDescription')}</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, followStreak: !f.followStreak }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.followStreak ? 'bg-accent-purple' : 'bg-gray-600'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.followStreak ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Actions */}
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
