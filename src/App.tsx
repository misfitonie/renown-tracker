import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameState } from './hooks/useGameState';
import { usePlayers } from './hooks/usePlayers';
import { useToast } from './hooks/useToast';
import { useConfirm } from './hooks/useConfirm';
import { Header } from './components/Header';
import { FactionCard } from './components/FactionCard';
import { QuestCard } from './components/QuestCard';
import { QuestFormModal, QuestFormData } from './components/QuestFormModal';
import { FactionFormModal, FactionFormData } from './components/FactionFormModal';
import { HistoryModal } from './components/HistoryModal';
import { TransferModal, TransferMode } from './components/TransferModal';
import { IconImage } from './components/IconImage';
import { PlayerSelectScreen } from './components/PlayerSelectScreen';
import { AuthScreen } from './components/AuthScreen';
import { AccountBar, AccountInfo } from './components/AccountBar';
import { useAuth, Auth } from './hooks/useAuth';
import { clearAccountCache } from './hooks/usePlayers';
import { ToastContainer } from './components/ToastContainer';
import { Quest, Faction, FactionId, Player, GameState } from './types';
import { isQuestCompleted } from './utils/gameLogic';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Download, Upload, RotateCcw, Plus, Settings, ChevronLeft, History, Moon, Sun } from 'lucide-react';
import { useTheme } from './hooks/useTheme';
import { THEME_IDS, ThemeId } from './utils/themes';
import { downloadJson, pickJsonFile } from './utils/file';

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
  onImportPlayer,
  themeId,
  onThemeChange,
  account,
}: {
  player: Player;
  onUpdateGameState: (updater: GameState | ((prev: GameState) => GameState)) => void;
  onSwitchPlayer: () => void;
  onExportPlayer: () => void;
  onImportPlayer: (jsonString: string) => boolean;
  themeId: ThemeId;
  onThemeChange: (id: ThemeId) => void;
  account?: AccountInfo;
}) {
  const { toasts, showToast, removeToast } = useToast();
  const { confirm, confirmDialog } = useConfirm();

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
    reorderFactions,
    resetAllData,
    importFaction,
  } = useGameState(player.gameState, onUpdateGameState, showToast, handleFactionLevelUp, confirm);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = gameState.factions.findIndex(f => f.id === active.id);
    const newIndex = gameState.factions.findIndex(f => f.id === over.id);
    reorderFactions(arrayMove(gameState.factions, oldIndex, newIndex));
  };

  const { t, i18n } = useTranslation();

  const [modal, setModal] = useState<QuestModalState | null>(null);
  const [factionModal, setFactionModal] = useState<FactionModalState | null>(null);
  const [selectedFactionId, setSelectedFactionId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [transferMode, setTransferMode] = useState<TransferMode | null>(null);
  const [questFilter, setQuestFilter] = useState<'all' | 'incomplete' | 'complete'>('all');
  const [mobileView, setMobileView] = useState<'factions' | 'quests'>('factions');
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

  const handleExportFaction = (faction: Faction) => {
    const quests = gameState.quests.filter(q => q.factionId === faction.id);
    downloadJson({ faction, quests }, `faction-${faction.name.toLowerCase()}-${Date.now()}.json`);
  };

  const handleImportFaction = () => pickJsonFile(importFaction);

  const handleImportPlayer = () =>
    pickJsonFile(content => {
      if (!onImportPlayer(content)) showToast(t('toast.profileImportError'), 'error');
    });

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

  const applyFilter = (quests: Quest[]) => {
    const sorted = [...quests].sort((a, b) => Number(isQuestCompleted(a)) - Number(isQuestCompleted(b)));
    if (questFilter === 'incomplete') return sorted.filter(q => !isQuestCompleted(q));
    if (questFilter === 'complete') return sorted.filter(q => isQuestCompleted(q));
    return sorted;
  };

  const dailyQuests = applyFilter(factionQuests.filter(q => q.type === 'daily'));
  const weeklyQuests = applyFilter(factionQuests.filter(q => q.type === 'weekly'));
  const monthlyQuests = applyFilter(factionQuests.filter(q => q.type === 'monthly'));
  const yearlyQuests = applyFilter(factionQuests.filter(q => q.type === 'yearly'));

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
          <div className="absolute top-11 left-0 bg-bg-card border border-gray-700 rounded-lg shadow-xl overflow-hidden w-64">
            {account && (
              <>
                <AccountBar account={{ ...account, onSignIn: () => { setMenuOpen(false); account.onSignIn(); } }} stacked className="px-4 py-2.5" />
                <div className="border-t border-gray-700" />
              </>
            )}
            <button
              onClick={() => { setHistoryOpen(true); setMenuOpen(false); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors"
            >
              <History size={14} />
              {t('app.settings.history')}
            </button>
            <div className="grid grid-cols-2 border-t border-gray-700">
              <button
                onClick={() => { setTransferMode('import'); setMenuOpen(false); }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-white hover:bg-white/5 transition-colors border-r border-gray-700"
              >
                <Upload size={14} />
                {t('app.settings.import')}
              </button>
              <button
                onClick={() => { setTransferMode('export'); setMenuOpen(false); }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-white hover:bg-white/5 transition-colors"
              >
                <Download size={14} />
                {t('app.settings.export')}
              </button>
            </div>
            <div className="border-t border-gray-700" />
            <div className="px-4 py-2.5">
              <p className="text-xs text-gray-500 mb-2">{t('app.settings.theme')}</p>
              <div className="flex gap-1.5">
                {THEME_IDS.map(id => {
                  const Icon = id === 'dark' ? Moon : Sun;
                  return (
                    <button
                      key={id}
                      onClick={() => onThemeChange(id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1 text-xs rounded transition-colors font-bold"
                      style={{
                        backgroundColor: themeId === id ? 'var(--theme-outline)' : 'transparent',
                        color: themeId === id ? 'rgb(var(--c-white))' : 'rgb(var(--c-gray-500))',
                        border: '1px solid var(--theme-outline)',
                      }}
                    >
                      <Icon size={12} />
                      {t(`app.settings.themes.${id}`)}
                    </button>
                  );
                })}
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
                      color: i18n.language === lang ? 'rgb(var(--c-white))' : 'rgb(var(--c-gray-500))',
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

      <div className="relative z-10 container mx-auto px-4 py-4 md:py-8 max-w-7xl">
        <Header
          currency={gameState.currency}
          player={player}
          playerXP={gameState.playerXP}
          playerLevel={gameState.playerLevel}
          onSwitchPlayer={onSwitchPlayer}
        />

        <div className="flex flex-col md:flex-row md:gap-14 items-start">
          {/* Colonne gauche — Factions */}
          <div className={`w-full md:w-1/3 md:flex-shrink-0 space-y-3 ${mobileView === 'quests' ? 'hidden md:block' : ''}`}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={gameState.factions.map(f => f.id)} strategy={verticalListSortingStrategy}>
                {gameState.factions.map((faction) => (
                  <FactionCard
                    key={faction.id}
                    faction={faction}
                    selected={selectedFaction?.id === faction.id}
                    levelUpTrigger={levelUpTriggers[faction.id] ?? 0}
                    onClick={() => { setSelectedFactionId(faction.id); setQuestFilter('all'); setMobileView('quests'); }}
                    onEdit={() => setFactionModal({ mode: 'edit', faction })}
                    onDelete={() => deleteFaction(faction.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <button
              onClick={() => setFactionModal({ mode: 'create' })}
              className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-dashed border-gray-700 hover:border-gray-500 text-gray-600 hover:text-gray-400 transition-all text-sm"
            >
              <Plus size={16} />
              {t('faction.newFaction')}
            </button>
          </div>

          {/* Colonne droite — Quêtes */}
          <div className={`w-full md:flex-1 min-w-0 ${mobileView === 'factions' ? 'hidden md:block' : ''}`}>
            {selectedFaction ? (
              <>
                {/* Bouton retour (mobile uniquement) */}
                <button
                  className="md:hidden flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-4 transition-colors"
                  onClick={() => setMobileView('factions')}
                >
                  <ChevronLeft size={16} />
                  {t('app.backToFactions')}
                </button>

                {/* En-tête faction */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <IconImage image={selectedFaction.image} emoji={selectedFaction.icon} className="text-3xl" imageClassName="w-10 h-10" />
                    <div>
                      <h2 className="text-2xl font-title text-white">{selectedFaction.name}</h2>
                      <p className="text-sm" style={{ color: selectedFaction.color }}>
                        {t('faction.headerLevel', { level: selectedFaction.renownLevel, current: selectedFaction.currentXP, max: selectedFaction.xpToNextLevel })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportFaction(selectedFaction)}
                      className="flex items-center gap-1.5 bg-bg-card hover:bg-bg-card/80 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors border border-gray-700 text-sm"
                      title={t('faction.exportFaction')}
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => setModal({ mode: 'create', defaultFactionId: selectedFaction.id })}
                      className="flex items-center gap-1.5 bg-bg-card hover:bg-bg-card/80 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors border border-gray-700 text-sm"
                    >
                      <Plus size={15} />
                      {t('quest.addQuest')}
                    </button>
                  </div>
                </div>

                {/* Filtres */}
                <div className="flex gap-1.5 mb-6">
                  {(['all', 'incomplete', 'complete'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setQuestFilter(f)}
                      className="px-3 py-1 text-xs rounded-full border transition-colors"
                      style={{
                        backgroundColor: questFilter === f ? selectedFaction.color + '22' : 'transparent',
                        borderColor: questFilter === f ? selectedFaction.color + '88' : 'rgb(var(--c-gray-700))',
                        color: questFilter === f ? selectedFaction.color : 'rgb(var(--c-gray-500))',
                      }}
                    >
                      {t(`quest.filter.${f === 'all' ? 'all' : f === 'incomplete' ? 'todo' : 'done'}`)}
                    </button>
                  ))}
                </div>

                {factionQuests.length === 0 && (
                  <p className="text-gray-600 text-sm italic">{t('quest.noQuests')}</p>
                )}

                {([
                  { quests: dailyQuests, label: t('quest.sectionDaily') },
                  { quests: weeklyQuests, label: t('quest.sectionWeekly') },
                  { quests: monthlyQuests, label: t('quest.sectionMonthly') },
                  { quests: yearlyQuests, label: t('quest.sectionYearly') },
                ] as const).map(({ quests, label }) =>
                  quests.length > 0 ? (
                    <div key={label} className="mb-8">
                      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">{label}</h3>
                      <div className="space-y-3">
                        {quests.map((quest) => (
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
                  ) : null
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
      {historyOpen && (
        <HistoryModal history={gameState.history ?? []} onClose={() => setHistoryOpen(false)} />
      )}

      {transferMode && (
        <TransferModal
          mode={transferMode}
          factions={gameState.factions}
          onProfile={() => {
            if (transferMode === 'export') onExportPlayer(); else handleImportPlayer();
            setTransferMode(null);
          }}
          onFaction={(faction) => {
            if (transferMode === 'export') { if (faction) handleExportFaction(faction); } else handleImportFaction();
            setTransferMode(null);
          }}
          onClose={() => setTransferMode(null)}
        />
      )}

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
      {confirmDialog}

      {/* Footer */}
      <footer className="text-center py-4 mt-2">
        <a
          href="https://github.com/misfitonie"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-700 hover:text-gray-500 transition-colors"
        >
          github.com/misfitonie
        </a>
      </footer>
    </div>
  );
}


function PlayersApp({
  auth,
  userId,
  themeId,
  onThemeChange,
}: {
  auth: Auth;
  userId: string | null;
  themeId: ThemeId;
  onThemeChange: (id: ThemeId) => void;
}) {
  const {
    store,
    activePlayer,
    syncStatus,
    hasPendingChanges,
    updateActiveGameState,
    createPlayer,
    editPlayer,
    deletePlayer,
    selectPlayer,
    exportPlayer,
    importPlayer,
  } = usePlayers(userId);

  const [showSelectScreen, setShowSelectScreen] = useState(false);
  const { confirm, confirmDialog } = useConfirm();
  const { t } = useTranslation();

  const handleSignOut = async () => {
    if (!userId) return;
    if (hasPendingChanges && !(await confirm(t('auth.account.signOutPending')))) return;
    await auth.signOut();
    clearAccountCache(userId);
  };

  const account: AccountInfo | undefined = auth.enabled
    ? {
        email: userId ? (auth.user?.email ?? '') : null,
        syncStatus,
        onSignIn: () => auth.setGuest(false),
        onSignOut: handleSignOut,
      }
    : undefined;

  const handleImportPlayer = () =>
    pickJsonFile(content => {
      importPlayer(content);
      setShowSelectScreen(false);
    });

  // Afficher l'écran de sélection si pas de joueur actif ou si demandé
  if (!activePlayer || showSelectScreen) {
    return (
      <>
        <PlayerSelectScreen
          players={store.players}
          onCreate={(data) => { createPlayer(data); setShowSelectScreen(false); }}
          onEdit={editPlayer}
          onDelete={deletePlayer}
          onSelect={(id) => { selectPlayer(id); setShowSelectScreen(false); }}
          onExport={exportPlayer}
          onImport={handleImportPlayer}
          account={account}
        />
        {confirmDialog}
      </>
    );
  }

  return (
    <>
      <GameApp
        key={activePlayer.id}
        player={activePlayer}
        onUpdateGameState={updateActiveGameState}
        onSwitchPlayer={() => setShowSelectScreen(true)}
        onExportPlayer={() => exportPlayer(activePlayer.id)}
        onImportPlayer={importPlayer}
        themeId={themeId}
        onThemeChange={onThemeChange}
        account={account}
      />
      {confirmDialog}
    </>
  );
}

function App() {
  const auth = useAuth();
  const { themeId, setThemeId } = useTheme();

  if (auth.status === 'loading') {
    return <div className="min-h-screen" style={{ backgroundColor: 'var(--theme-bg)' }} />;
  }

  if (auth.recovering || (auth.status === 'signedOut' && !auth.guest)) {
    return <AuthScreen auth={auth} />;
  }

  const userId = auth.status === 'signedIn' ? (auth.user?.id ?? null) : null;

  return (
    <PlayersApp
      key={userId ?? 'guest'}
      auth={auth}
      userId={userId}
      themeId={themeId}
      onThemeChange={setThemeId}
    />
  );
}

export default App;
