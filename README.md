# Renown Tracker

**Level Up Your Life** — Un tracker de développement personnel gamifié.

---

## Concept

L'idée est simple : transformer des habitudes du quotidien en système de quêtes RPG. Chaque domaine de vie devient une **faction** (travail, sport, culture, etc.), chaque habitude devient une **quête** avec une récompense en XP et en gemmes. Compléter ses quêtes fait monter le niveau de renommée de chaque faction, ce qui contribue à la progression globale du joueur.

L'inspiration vient du système de renommées de World of Warcraft — progresser dans plusieurs factions en parallèle, chacune avec sa propre courbe de progression.

---

## Stack

- **React 18 + TypeScript** — pas de framework lourd, juste React et ses hooks
- **Vite** — build tool rapide, HMR natif
- **Tailwind CSS** — utility-first, pas de composants UI tiers
- **Lucide React** — icônes légères tree-shakeable
- **i18next + react-i18next** — internationalisation FR/EN
- **localStorage** — persistance locale, pas de backend

---

## Installation

```bash
npm install
npm run dev
```

Build de production :

```bash
npm run build
```

---

## Architecture

```
src/
├── components/
│   ├── FactionCard.tsx        # Carte faction avec anneau SVG de progression + animation level-up
│   ├── QuestCard.tsx          # Carte quête avec badge streak, lien hebdo
│   ├── QuestFormModal.tsx     # CRUD quêtes (avec lien journalière → hebdo)
│   ├── FactionFormModal.tsx   # CRUD factions
│   ├── PlayerFormModal.tsx    # CRUD profils joueurs
│   ├── PlayerSelectScreen.tsx # Écran de sélection de personnage
│   ├── Header.tsx             # Card joueur : niveau, barre XP, gemmes
│   └── ToastContainer.tsx     # Notifications
├── hooks/
│   ├── usePlayers.ts          # Store multi-joueurs (localStorage)
│   ├── useGameState.ts        # Logique de jeu (découplée du stockage)
│   ├── useTheme.ts            # Gestion des thèmes visuels
│   └── useToast.ts            # Système de notifications
├── i18n/
│   ├── index.ts               # Config i18next (langue persistée en localStorage)
│   └── locales/
│       ├── fr.json            # Traductions françaises
│       └── en.json            # Traductions anglaises
├── types/
│   └── index.ts               # Tous les types TypeScript
├── utils/
│   ├── gameLogic.ts           # XP, level up/down, reset logic
│   ├── initialData.ts         # Données de départ
│   └── themes.ts              # Définitions des 5 thèmes visuels
└── App.tsx                    # Orchestration + routing joueur
```

---

## Choix techniques

### Séparation stockage / logique (`usePlayers` + `useGameState`)

Le choix le plus structurant du projet. `usePlayers` est le seul responsable du stockage. `useGameState` reçoit un `gameState` et un `setGameState` en props — ce qui le rend indépendant du système multi-joueurs et facilite les tests.

```typescript
// usePlayers.ts
const updateActiveGameState = useCallback(
  (updater: GameState | ((prev: GameState) => GameState)) => {
    setStore(prev => {
      const current = prev.players.find(p => p.id === prev.activePlayerId);
      const newGameState =
        typeof updater === 'function' ? updater(current.gameState) : updater;
      return {
        ...prev,
        players: prev.players.map(p =>
          p.id === prev.activePlayerId ? { ...p, gameState: newGameState } : p
        ),
      };
    });
  }, []
);
```

### Remount sur changement de joueur (`key` prop)

```tsx
<GameApp
  key={activePlayer.id}  // force unmount/remount complet
  player={activePlayer}
  onUpdateGameState={updateActiveGameState}
/>
```

Pas besoin de gérer manuellement la réinitialisation des états locaux.

### Système de thèmes via CSS custom properties

5 thèmes dark définis dans `themes.ts` avec 3 valeurs hex (`bg`, `cardBg`, `outline`). `useTheme` convertit ces hex en RGB pour le support des modificateurs d'opacité Tailwind et injecte les vars CSS sur `:root` :

```typescript
root.style.setProperty('--theme-bg', theme.bg);
root.style.setProperty('--theme-card-bg', theme.cardBg);
root.style.setProperty('--theme-outline', theme.outline);
// + --color-bg-dark / --color-bg-card en format "R G B" pour Tailwind
```

Le thème est persisté dans `renown-tracker-theme`.

### Lien quête journalière → hebdo (`linkedWeeklyQuestId`)

Une quête journalière peut être liée à une quête hebdo de type progression. Quand la journalière est complétée, le compteur de la hebdo est auto-incrémenté. Si la hebdo atteint sa cible, elle est complétée avec ses récompenses dans le même `setGameState` (update atomique).

```typescript
// useGameState.ts — dans completeQuest()
if (quest.linkedWeeklyQuestId) {
  const weekly = finalQuests.find(q => q.id === quest.linkedWeeklyQuestId);
  if (weekly && !isQuestCompleted(weekly) && weekly.completionType === 'progress') {
    // incrément + complétion si target atteinte
  }
}
```

### Régression de niveau à la dévalidation

Décocher une quête retire l'XP **et fait régresser le niveau** si nécessaire, en remontant dans les niveaux précédents :

```typescript
// gameLogic.ts
export function removeXPFromFaction(faction, xpAmount) {
  let newXP = faction.currentXP - xpAmount;
  let newLevel = faction.renownLevel;
  while (newXP < 0 && newLevel > 0) {
    newLevel--;
    newXP += getXPForNextLevel(newLevel); // récupère la capacité du niveau inférieur
  }
  // ...
}
```

La même logique s'applique à `removePlayerXP` pour le niveau joueur.

### Animation de barre XP au level-up

Au lieu de lier la largeur de la barre directement à la valeur XP (ce qui donnerait une réduction visible), les composants `FactionCard` et `Header` maintiennent un `displayPercent` indépendant qui joue une séquence en 3 phases :

1. Remplir jusqu'à 100% (transition 500ms)
2. Reset instantané à 0% (`transition: none`)
3. Remplir vers la nouvelle valeur (transition 500ms)

Un `animatingRef` bloque les mises à jour React entrantes pendant l'animation.

### Internationalisation (i18next)

Deux langues (FR/EN) via `react-i18next`. La langue est persistée dans `renown-tracker-lang`. Pour les contextes non-React (toasts, `confirm()` dans `useGameState`), `i18n.t()` est importé directement depuis le module i18n.

### Format de stockage : clé unique

Une seule clé `renown-tracker` contient l'ensemble du store :

```json
{
  "activePlayerId": "player-123",
  "players": [
    { "id": "player-123", "name": "Théo", "emoji": "🧙", "gameState": { "..." } }
  ]
}
```

Lecture/écriture atomique, pas de désynchronisation possible.

### Anneau de progression SVG

```tsx
const circumference = 2 * Math.PI * radius;
const displayOffset = circumference - (displayPercent / 100) * circumference;
// strokeDashoffset animé via transition CSS ou séquence level-up
```

---

## Fonctionnement du jeu

### Courbe d'XP factions

Progression linéaire, les factions démarrent au **niveau 0** :

```typescript
export function getXPForNextLevel(level: number): number {
  return 100 * (level + 1); // niveau 0 → 1 : 100 XP, niveau 1 → 2 : 200 XP...
}
```

Le surplus XP est toujours préservé au level-up (boucle `while` recalculant le seuil à chaque itération).

### Niveau joueur

Le joueur a son propre niveau indépendant des factions. Chaque level-up de faction récompense le joueur en XP équivalent au **coût du niveau franchi** :

```
Faction niveau 2 → 3 (coût 300 XP) → joueur reçoit 300 XP joueur
```

La barre joueur suit la même formule `100 × (playerLevel + 1)`.

### Système de streak

- À la complétion : `streakCount++`
- Au reset daily/weekly : si la quête n'était **pas** complétée → `streakCount = 0`

Pas de champ `lastCompletedAt` — le mécanisme de reset existant suffit à détecter les jours/semaines manqués.

### Reset des quêtes

- **Daily** : reset si `lastDailyReset` est un jour différent d'aujourd'hui
- **Weekly** : reset si le dernier lundi avant `lastWeeklyReset` ≠ le dernier lundi avant maintenant

Le reset se déclenche au montage de `useGameState`, dans un `useEffect([], [])`.

---

## Roadmap

- [x] CRUD factions et quêtes
- [x] Système de streak
- [x] Multi-joueurs
- [x] Animations level-up (faction card + barre XP)
- [x] Système de thèmes visuels (5 thèmes dark)
- [x] Niveau global du joueur (découplé des factions)
- [x] Lien quête journalière → hebdo (auto-incrément)
- [x] Dévalidation avec régression de niveau
- [x] Internationalisation FR/EN
- [ ] Responsive mobile
- [ ] Historique des actions
- [ ] Filtres sur les quêtes (incomplètes, par faction...)

---

## Licence

MIT
