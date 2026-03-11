import { useState } from 'react';
import { X } from 'lucide-react';
import { Quest, Faction, FactionId, QuestType, CompletionType } from '../types';

export interface QuestFormData {
  title: string;
  description: string;
  factionId: FactionId;
  type: QuestType;
  completionType: CompletionType;
  target: number;
  xpReward: number;
  currencyReward: number;
}

interface QuestFormModalProps {
  initialData?: Quest;
  defaultFactionId?: FactionId;
  factions: Faction[];
  onSave: (data: QuestFormData) => void;
  onClose: () => void;
}

export function QuestFormModal({ initialData, defaultFactionId, factions, onSave, onClose }: QuestFormModalProps) {
  const [form, setForm] = useState<QuestFormData>({
    title: initialData?.title ?? '',
    description: initialData?.description ?? '',
    factionId: initialData?.factionId ?? defaultFactionId ?? factions[0].id,
    type: initialData?.type ?? 'daily',
    completionType: initialData?.completionType ?? 'boolean',
    target: initialData?.target ?? 5,
    xpReward: initialData?.xpReward ?? 50,
    currencyReward: initialData?.currencyReward ?? 10,
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
            {initialData ? 'Modifier la quête' : 'Nouvelle quête'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Titre */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Titre *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className={inputClass}
              placeholder="Ex: Postuler à 3 offres d'emploi"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className={inputClass}
              placeholder="Description optionnelle"
            />
          </div>

          {/* Faction + Fréquence */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Faction</label>
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
              <label className="block text-sm text-gray-400 mb-1">Fréquence</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as QuestType }))}
                className={inputClass}
              >
                <option value="daily">Journalière</option>
                <option value="weekly">Hebdomadaire</option>
              </select>
            </div>
          </div>

          {/* Type de complétion */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Type de complétion</label>
            <select
              value={form.completionType}
              onChange={e => setForm(f => ({ ...f, completionType: e.target.value as CompletionType }))}
              className={inputClass}
            >
              <option value="boolean">Oui / Non (valider d'un clic)</option>
              <option value="progress">Progression (compteur jusqu'à une cible)</option>
            </select>
          </div>

          {/* Objectif (progress uniquement) */}
          {form.completionType === 'progress' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Objectif</label>
              <input
                type="number"
                min={1}
                value={form.target}
                onChange={e => setForm(f => ({ ...f, target: Math.max(1, parseInt(e.target.value) || 1) }))}
                className={inputClass}
              />
            </div>
          )}

          {/* Récompenses */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">XP</label>
              <input
                type="number"
                min={0}
                value={form.xpReward}
                onChange={e => setForm(f => ({ ...f, xpReward: Math.max(0, parseInt(e.target.value) || 0) }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Gemmes</label>
              <input
                type="number"
                min={0}
                value={form.currencyReward}
                onChange={e => setForm(f => ({ ...f, currencyReward: Math.max(0, parseInt(e.target.value) || 0) }))}
                className={inputClass}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-bg-dark hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg transition-colors border border-gray-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 bg-accent-purple hover:bg-accent-purple/80 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {initialData ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
