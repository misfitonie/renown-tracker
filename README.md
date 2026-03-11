# Renown Tracker

**Level Up Your Life** — Un tracker de développement personnel gamifié.

---

## Concept

L'idée est simple : transformer des habitudes du quotidien en système de quêtes RPG. Chaque domaine de vie devient une **faction** (travail, sport, culture, etc.), chaque habitude devient une **quête** avec une récompense en XP et en gemmes. Compléter ses quêtes fait monter le niveau de renommée de chaque faction.

L'inspiration vient du système de renommées de World of Warcraft — progresser dans plusieurs factions en parallèle, chacune avec sa propre courbe de progression.

---

## Stack

- **React 18 + TypeScript** — pas de framework lourd, juste React et ses hooks
- **Vite** — build tool rapide, HMR natif
- **Tailwind CSS** — utility-first, pas de composants UI tiers
- **Lucide React** — icônes légères tree-shakeable
- **localStorage** — persistance locale, pas de backend

Zéro dépendance externe pour la logique métier. Tout est en vanilla React/TS.

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
│   ├── FactionCard.tsx        # Carte faction avec anneau SVG de progression
│   ├── QuestCard.tsx          # Carte quête avec badge streak
│   ├── QuestFormModal.tsx     # CRUD quêtes
│   ├── FactionFormModal.tsx   # CRUD factions
│   ├── PlayerFormModal.tsx    # CRUD profils joueurs
│   ├── PlayerSelectScreen.tsx # Écran de sélection de personnage
│   ├── Header.tsx             # Header avec joueur actif + gemmes
│   └── ToastContainer.tsx     # Notifications
├── hooks/
│   ├── usePlayers.ts          # Store multi-joueurs (localStorage)
│   ├── useGameState.ts        # Logique de jeu (découplée du stockage)
│   └── useToast.ts            # Système de notifications
├── types/
│   └── index.ts               # Tous les types TypeScript
├── utils/
│   ├── gameLogic.ts           # XP, level up, reset logic
│   └── initialData.ts         # Données de départ
└── App.tsx                    # Orchestration + routing joueur
```

---

## Choix techniques

### Séparation stockage / logique (`usePlayers` + `useGameState`)

Le choix le plus structurant du projet. Au départ, `useGameState` gérait à la fois la logique de jeu **et** la persistance localStorage. Quand on a voulu ajouter les profils multi-joueurs, il a fallu découpler les deux.

`usePlayers` est le seul responsable du stockage :

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

`useGameState` ne sait plus qu'il est dans un système multi-joueurs. Il reçoit un `gameState` et un `setGameState` en props, exactement comme un `useState` classique — ce qui rend les functional updates transparents.

### Remount sur changement de joueur (`key` prop)

Quand on change de joueur actif, React doit réinitialiser tous les états locaux des composants (modals ouverts, effets de reset des quêtes, etc.). La solution la plus propre : donner à `GameApp` une `key={player.id}`.

```tsx
// App.tsx
<GameApp
  key={activePlayer.id}  // force unmount/remount complet
  player={activePlayer}
  onUpdateGameState={updateActiveGameState}
/>
```

Pas besoin de gérer manuellement la réinitialisation — React s'en charge.

### FactionId : de union type à `string`

Au départ `FactionId = 'job' | 'sport' | 'culture'` — pratique pour l'autocompletion, mais incompatible avec des factions dynamiques créées par l'utilisateur. On a changé en `FactionId = string`.

La perte : TypeScript ne peut plus vérifier les IDs de faction à la compilation. Le gain : le CRUD de factions est possible sans toucher aux types.

### Système de streak sans date dédiée

Les streaks auraient pu nécessiter un champ `lastCompletedAt: string` pour détecter les jours manqués. On s'est appuyé sur le mécanisme de reset existant à la place :

- Au reset daily/weekly : si la quête n'est **pas** complétée → `streakCount = 0`
- À la complétion : `streakCount++`

Le reset se déclenche au chargement de l'app si le jour/la semaine a changé depuis le dernier reset. Ça couvre le cas "j'ouvre l'app le matin, les quêtes se resetent, les streaks brisés sont détectés".

### Format de stockage (Option A : clé unique)

Deux options avaient été envisagées :

**Option A** (retenue) — une seule clé `renown-tracker` :
```json
{
  "activePlayerId": "player-123",
  "players": [
    { "id": "player-123", "name": "Théo", "emoji": "🧙", "gameState": { "..." } }
  ]
}
```

**Option B** — une clé par joueur + une clé meta.

Option A choisie pour la simplicité : lecture/écriture atomique, pas de désynchronisation possible entre les clés. La limite de 5-10 MB de localStorage est largement suffisante pour quelques profils familiaux.

### Migration de l'ancien format

Si `renown-tracker-state` (ancien format mono-joueur) existe dans localStorage, il est automatiquement migré en premier joueur au démarrage de `usePlayers`. L'utilisateur ne perd pas ses données.

```typescript
const legacy = localStorage.getItem('renown-tracker-state');
if (legacy) {
  const player = {
    id: `player-${Date.now()}`,
    name: 'Joueur 1',
    emoji: '🧙',
    color: '#9d4edd',
    createdAt: new Date().toISOString(),
    gameState: JSON.parse(legacy),
  };
  return { activePlayerId: player.id, players: [player] };
}
```

### Anneau de progression SVG

La barre de progression circulaire des factions est un SVG natif avec `stroke-dasharray` / `stroke-dashoffset`. Pas de lib canvas ou de composant tiers.

```tsx
const circumference = 2 * Math.PI * 44; // rayon = 44
const offset = circumference - (progressPercentage / 100) * circumference;
// strokeDashoffset animé via transition CSS
```

---

## Fonctionnement du jeu

### Courbe d'XP

Progression linéaire : niveau N requiert `N × 100` XP.

```typescript
export function getXPForNextLevel(level: number): number {
  return 100 * level; // 100, 200, 300...
}
```

Pour une courbe exponentielle :
```typescript
return Math.floor(100 * Math.pow(1.5, level - 1));
```

### Reset des quêtes

- **Daily** : reset si `lastDailyReset` est un jour différent d'aujourd'hui
- **Weekly** : reset si le dernier lundi avant `lastWeeklyReset` ≠ le dernier lundi avant maintenant

Le reset se fait au montage du hook dans un `useEffect(() => {...}, [])`. Le streak brisé est détecté à ce moment-là, avant de remettre `completed` à `false`.

---

## Roadmap

- [ ] Modales de confirmation custom (remplacer les `confirm()` natifs)
- [ ] Niveau global du joueur (agrégat de toutes les factions)
- [ ] Responsive mobile
- [ ] Animations level-up
- [ ] Historique des actions
- [ ] Filtres sur les quêtes (incomplètes, par faction...)

---

## Licence

MIT
