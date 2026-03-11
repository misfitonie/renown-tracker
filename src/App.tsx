import { useState } from 'react';
import { useGameState } from './hooks/useGameState';
import { useToast } from './hooks/useToast';
import { Header } from './components/Header';
import { FactionCard } from './components/FactionCard';
import { QuestCard } from './components/QuestCard';
import { QuestFormModal, QuestFormData } from './components/QuestFormModal';
import { ToastContainer } from './components/ToastContainer';
import { Quest, FactionId } from './types';
import { Download, Upload, RotateCcw, Plus } from 'lucide-react';

type ModalState =
  | { mode: 'create'; defaultFactionId: FactionId }
  | { mode: 'edit'; quest: Quest };

function App() {
  const { toasts, showToast, removeToast } = useToast();
  const {
    gameState,
    completeQuest,
    incrementQuestProgress,
    addQuest,
    editQuest,
    deleteQuest,
    resetAllData,
    exportData,
    importData,
  } = useGameState(showToast);

  const [modal, setModal] = useState<ModalState | null>(null);

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          importData(event.target?.result as string);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleSave = (data: QuestFormData) => {
    if (modal?.mode === 'edit') {
      editQuest(modal.quest.id, data);
    } else {
      addQuest(data);
    }
    setModal(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-dark via-[#1a1430] to-bg-dark">
      {/* Gradient overlay */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,_rgba(157,78,221,0.1)_0%,_transparent_50%)]" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_80%_70%,_rgba(74,158,255,0.1)_0%,_transparent_50%)]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        <Header currency={gameState.currency} />

        {/* Actions globales */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          <button
            onClick={exportData}
            className="flex items-center gap-2 bg-bg-card hover:bg-bg-card/80 text-white px-4 py-2 rounded-lg transition-colors border border-gray-700"
          >
            <Download size={16} />
            Exporter
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-2 bg-bg-card hover:bg-bg-card/80 text-white px-4 py-2 rounded-lg transition-colors border border-gray-700"
          >
            <Upload size={16} />
            Importer
          </button>
          <button
            onClick={resetAllData}
            className="flex items-center gap-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 px-4 py-2 rounded-lg transition-colors border border-red-800"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>

        {/* Factions */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          {gameState.factions.map((faction) => (
            <FactionCard key={faction.id} faction={faction} />
          ))}
        </div>

        {/* Quêtes par faction */}
        {gameState.factions.map((faction) => {
          const factionQuests = gameState.quests.filter(q => q.factionId === faction.id);
          const dailyQuests = factionQuests.filter(q => q.type === 'daily');
          const weeklyQuests = factionQuests.filter(q => q.type === 'weekly');

          return (
            <div key={faction.id} className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{faction.icon}</span>
                  <h2 className="text-2xl font-title text-accent-gold">{faction.name}</h2>
                </div>
                <button
                  onClick={() => setModal({ mode: 'create', defaultFactionId: faction.id })}
                  className="flex items-center gap-1.5 bg-bg-card hover:bg-bg-card/80 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors border border-gray-700 text-sm"
                >
                  <Plus size={15} />
                  Ajouter une quête
                </button>
              </div>

              {/* Quêtes journalières */}
              {dailyQuests.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-300 mb-3">Quêtes journalières</h3>
                  <div className="space-y-3">
                    {dailyQuests.map((quest) => (
                      <QuestCard
                        key={quest.id}
                        quest={quest}
                        factionColor={faction.color}
                        onComplete={() => completeQuest(quest.id)}
                        onIncrement={() => incrementQuestProgress(quest.id)}
                        onEdit={() => setModal({ mode: 'edit', quest })}
                        onDelete={() => deleteQuest(quest.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Quêtes hebdomadaires */}
              {weeklyQuests.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-3">Quêtes hebdomadaires</h3>
                  <div className="space-y-3">
                    {weeklyQuests.map((quest) => (
                      <QuestCard
                        key={quest.id}
                        quest={quest}
                        factionColor={faction.color}
                        onComplete={() => completeQuest(quest.id)}
                        onIncrement={() => incrementQuestProgress(quest.id)}
                        onEdit={() => setModal({ mode: 'edit', quest })}
                        onDelete={() => deleteQuest(quest.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Faction vide */}
              {factionQuests.length === 0 && (
                <p className="text-gray-600 text-sm italic">Aucune quête pour cette faction.</p>
              )}
            </div>
          );
        })}

        {/* Footer */}
        <footer className="text-center text-gray-500 text-sm mt-16">
          <p>Renown Tracker - Level Up Your Life 🎮</p>
        </footer>
      </div>

      {/* Modal CRUD */}
      {modal && (
        <QuestFormModal
          initialData={modal.mode === 'edit' ? modal.quest : undefined}
          defaultFactionId={modal.mode === 'create' ? modal.defaultFactionId : undefined}
          factions={gameState.factions}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default App;
