import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameState } from './hooks/useGameState';
import { usePlayers } from './hooks/usePlayers';
import { useToast } from './hooks/useToast';
import { Header } from './components/Header';
import { FactionCard } from './components/FactionCard';
import { QuestCard } from './components/QuestCard';
import { QuestFormModal, QuestFormData } from './components/QuestFormModal';
import { FactionFormModal, FactionFormData } from './components/FactionFormModal';
import { PlayerSelectScreen } from './components/PlayerSelectScreen';
import { ToastContainer } from './components/ToastContainer';
import { Quest, Faction, FactionId, Player, GameState } from './types';
import { Download, Upload, RotateCcw, Plus, Settings } from 'lucide-react';
import { useTheme } from './hooks/useTheme';
import { THEMES } from './utils/themes';

type QuestModalState =
  | { mode: 'create'; defaultFactionId: FactionId }
  | { mode: 'edit'; quest: Quest };

type FactionModalState =
  | { mode: 'create' }
  | { mode: 'edit'; faction: Faction };

// Composant principal du jeu (remonté à chaque changement de joueur via key)
function GameApp({
  player,
  onUpdateGameState,
  onSwitchPlayer,
  onExportPlayer,
}: {
  player: Player;
  onUpdateGameState: (updater: GameState | ((prev: GameState) => GameState)) => void;
  onSwitchPlayer: () => void;
  onExportPlayer: () => void;
}) {
  const { toasts, showToast, removeToast } = useToast();

  const [levelUpTriggers, setLevelUpTriggers] = useState<Record<string, number>>({});
  const handleFactionLevelUp = (factionId: string) => {
    setLevelUpTriggers(prev => ({ ...prev, [factionId]: (prev[factionId] ?? 0) + 1 }));
  };

  const {
    gameState,
    completeQuest,
    incrementQuestProgress,
    uncompleteQuest,
    addQuest,
    editQuest,
    deleteQuest,
    addFaction,
    editFaction,
    deleteFaction,
    resetAllData,
    importData,
  } = useGameState(player.gameState, onUpdateGameState, showToast, handleFactionLevelUp);

  const { themeId, setThemeId } = useTheme();
  const { t, i18n } = useTranslation();

  const [modal, setModal] = useState<QuestModalState | null>(null);
  const [factionModal, setFactionModal] = useState<FactionModalState | null>(null);
  const [selectedFactionId, setSelectedFactionId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleFactionSave = (data: FactionFormData) => {
    if (factionModal?.mode === 'edit') {
      editFaction(factionModal.faction.id, data);
    } else {
      addFaction(data);
    }
    setFactionModal(null);
  };

  // Faction sélectionnée : celle cliquée, ou la première par défaut
  const selectedFaction =
    gameState.factions.find(f => f.id === selectedFactionId) ??
    gameState.factions[0] ??
    null;

  const factionQuests = selectedFaction
    ? gameState.quests.filter(q => q.factionId === selectedFaction.id)
    : [];
  const dailyQuests = factionQuests.filter(q => q.type === 'daily');
  const weeklyQuests = factionQuests.filter(q => q.type === 'weekly');

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--theme-bg)' }}
    >
      {/* Gradient overlay */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,_rgba(157,78,221,0.1)_0%,_transparent_50%)]" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_80%_70%,_rgba(74,158,255,0.1)_0%,_transparent_50%)]" />
      </div>

      {/* Menu déroulant discret en haut à gauche */}
      <div ref={menuRef} className="fixed top-4 left-4 z-50">
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="flex items-center justify-center w-9 h-9 bg-bg-card hover:bg-bg-card/80 text-gray-400 hover:text-white rounded-lg border border-gray-700 transition-colors"
        >
          <Settings size={16} />
        </button>
        {menuOpen && (
          <div className="absolute top-11 left-0 bg-bg-card border border-gray-700 rounded-lg shadow-xl overflow-hidden w-44">
            <button
              onClick={() => { onExportPlayer(); setMenuOpen(false); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors"
            >
              <Download size={14} />
              {t('app.settings.export')}
            </button>
            <button
              onClick={() => { handleImport(); setMenuOpen(false); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors"
            >
              <Upload size={14} />
              {t('app.settings.import')}
            </button>
            <div className="border-t border-gray-700" />
            <div className="px-4 py-2.5">
              <p className="text-xs text-gray-500 mb-2">{t('app.settings.theme')}</p>
              <div className="flex gap-2">
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setThemeId(t.id)}
                    title={t.label}
                    className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: t.cardBg,
                      borderColor: themeId === t.id ? 'white' : 'transparent',
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="border-t border-gray-700" />
            <div className="px-4 py-2.5">
              <p className="text-xs text-gray-500 mb-2">{t('app.settings.language')}</p>
              <div className="flex gap-1.5">
                {['fr', 'en'].map(lang => (
                  <button
                    key={lang}
                    onClick={() => i18n.changeLanguage(lang)}
                    className="flex-1 px-2 py-1 text-xs rounded transition-colors font-bold"
                    style={{
                      backgroundColor: i18n.language === lang ? 'var(--theme-outline)' : 'transparent',
                      color: i18n.language === lang ? 'white' : '#6b7280',
                      border: '1px solid var(--theme-outline)',
                    }}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-700" />
            <button
              onClick={() => { resetAllData(); setMenuOpen(false); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/20 transition-colors"
            >
              <RotateCcw size={14} />
              {t('app.settings.reset')}
            </button>
          </div>
        )}
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        <Header
          currency={gameState.currency}
          player={player}
          playerXP={gameState.playerXP}
          playerLevel={gameState.playerLevel}
          onSwitchPlayer={onSwitchPlayer}
        />

        <div className="flex gap-14 items-start">
          {/* Colonne gauche — Factions (1/3) */}
          <div className="w-1/3 flex-shrink-0 space-y-3">
            {gameState.factions.map((faction) => (
              <FactionCard
                key={faction.id}
                faction={faction}
                selected={selectedFaction?.id === faction.id}
                levelUpTrigger={levelUpTriggers[faction.id] ?? 0}
                onClick={() => setSelectedFactionId(faction.id)}
                onEdit={() => setFactionModal({ mode: 'edit', faction })}
                onDelete={() => deleteFaction(faction.id)}
              />
            ))}
            <button
              onClick={() => setFactionModal({ mode: 'create' })}
              className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-dashed border-gray-700 hover:border-gray-500 text-gray-600 hover:text-gray-400 transition-all text-sm"
            >
              <Plus size={16} />
              {t('faction.newFaction')}
            </button>
          </div>

          {/* Colonne droite — Quêtes (2/3) */}
          <div className="flex-1 min-w-0">
            {selectedFaction ? (
              <>
                {/* En-tête faction */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{selectedFaction.icon}</span>
                    <div>
                      <h2 className="text-2xl font-title text-white">{selectedFaction.name}</h2>
                      <p className="text-sm" style={{ color: selectedFaction.color }}>
                        {t('faction.headerLevel', { level: selectedFaction.renownLevel, current: selectedFaction.currentXP, max: selectedFaction.xpToNextLevel })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setModal({ mode: 'create', defaultFactionId: selectedFaction.id })}
                    className="flex items-center gap-1.5 bg-bg-card hover:bg-bg-card/80 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors border border-gray-700 text-sm"
                  >
                    <Plus size={15} />
                    {t('quest.addQuest')}
                  </button>
                </div>

                {factionQuests.length === 0 && (
                  <p className="text-gray-600 text-sm italic">{t('quest.noQuests')}</p>
                )}

                {dailyQuests.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">{t('quest.sectionDaily')}</h3>
                    <div className="space-y-3">
                      {dailyQuests.map((quest) => (
                        <QuestCard
                          key={quest.id}
                          quest={quest}
                          factionColor={selectedFaction.color}
                          onComplete={() => completeQuest(quest.id)}
                          onUncomplete={() => uncompleteQuest(quest.id)}
                          onIncrement={() => incrementQuestProgress(quest.id)}
                          onEdit={() => setModal({ mode: 'edit', quest })}
                          onDelete={() => deleteQuest(quest.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {weeklyQuests.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">{t('quest.sectionWeekly')}</h3>
                    <div className="space-y-6">
                      {weeklyQuests.map((quest) => (
                        <QuestCard
                          key={quest.id}
                          quest={quest}
                          factionColor={selectedFaction.color}
                          onComplete={() => completeQuest(quest.id)}
                          onUncomplete={() => uncompleteQuest(quest.id)}
                          onIncrement={() => incrementQuestProgress(quest.id)}
                          onEdit={() => setModal({ mode: 'edit', quest })}
                          onDelete={() => deleteQuest(quest.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-600">
                <p className="text-sm italic">{t('faction.emptyMessage')}</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal faction */}
      {factionModal && (
        <FactionFormModal
          initialData={factionModal.mode === 'edit' ? factionModal.faction : undefined}
          onSave={handleFactionSave}
          onClose={() => setFactionModal(null)}
        />
      )}

      {/* Modal quête */}
      {modal && (
        <QuestFormModal
          initialData={modal.mode === 'edit' ? modal.quest : undefined}
          defaultFactionId={modal.mode === 'create' ? modal.defaultFactionId : undefined}
          factions={gameState.factions}
          quests={gameState.quests}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function App() {
  const {
    store,
    activePlayer,
    updateActiveGameState,
    createPlayer,
    editPlayer,
    deletePlayer,
    selectPlayer,
    exportPlayer,
    importPlayer,
  } = usePlayers();

  const [showSelectScreen, setShowSelectScreen] = useState(false);

  const handleImportPlayer = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          importPlayer(event.target?.result as string);
          setShowSelectScreen(false);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // Afficher l'écran de sélection si pas de joueur actif ou si demandé
  if (!activePlayer || showSelectScreen) {
    return (
      <PlayerSelectScreen
        players={store.players}
        onCreate={(data) => { createPlayer(data); setShowSelectScreen(false); }}
        onEdit={editPlayer}
        onDelete={deletePlayer}
        onSelect={(id) => { selectPlayer(id); setShowSelectScreen(false); }}
        onExport={exportPlayer}
        onImport={handleImportPlayer}
      />
    );
  }

  return (
    <GameApp
      key={activePlayer.id}
      player={activePlayer}
      onUpdateGameState={updateActiveGameState}
      onSwitchPlayer={() => setShowSelectScreen(true)}
      onExportPlayer={() => exportPlayer(activePlayer.id)}
    />
  );
}

export default App;
