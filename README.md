# Renown Tracker

**Level Up Your Life** — Un tracker de développement personnel gamifié.

---

## Concept

L'idée est simple : transformer des habitudes du quotidien en système de quêtes RPG. Chaque domaine de vie devient une **faction** (travail, sport, culture, etc.), chaque habitude devient une **quête** (journalière, hebdomadaire, mensuelle ou annuelle) avec une récompense en XP et en gemmes. Compléter ses quêtes fait monter le niveau de renommée de chaque faction, ce qui contribue à la progression globale du joueur.

L'inspiration vient du système de renommées de World of Warcraft — progresser dans plusieurs factions en parallèle, chacune avec sa propre courbe de progression.

---

## Stack

- **React 18 + TypeScript** — pas de framework lourd, juste React et ses hooks
- **Vite** — build tool rapide, HMR natif
- **Tailwind CSS** — utility-first, pas de composants UI tiers
- **Lucide React** — icônes légères tree-shakeable
- **dnd-kit** — drag & drop pour réordonner les factions
- **i18next + react-i18next** — internationalisation FR/EN
- **Supabase** (optionnel) — comptes Google / email et synchronisation des profils entre appareils
- **localStorage** — cache local, mode hors ligne et mode sans compte
- **Vercel** — déploiement, avec une preview par PR
- **Vitest + ESLint + GitHub Actions** — tests, lint et CI

---

## Installation

```bash
npm install
npm run dev
```

Sans configuration, l'app tourne en mode local (sans compte). Pour activer les comptes et la synchronisation,
voir [docs/supabase.md](docs/supabase.md) puis `cp .env.example .env.local`.

Build de production :

```bash
npm run build
```

Vérifications (lancées aussi par la CI GitHub Actions sur chaque PR) :

```bash
npm run lint
npm test        # tests unitaires Vitest de gameLogic
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
│   ├── HistoryModal.tsx       # Historique des actions, groupé par jour
│   ├── ImageUploadField.tsx   # Champ d'import d'image (avatar / icône faction)
│   ├── IconImage.tsx          # Affiche l'image importée, sinon l'emoji
│   ├── TransferModal.tsx      # Modale Import / Export (profil ou faction)
│   ├── AuthScreen.tsx         # Connexion Google / email, inscription, mot de passe oublié
│   ├── AccountBar.tsx         # Compte connecté + état de la synchro
│   └── ToastContainer.tsx     # Notifications
├── hooks/
│   ├── useConfirm.tsx         # Modale de confirmation (remplace window.confirm)
│   ├── useAuth.ts             # Session Supabase, mode sans compte
│   ├── usePlayers.ts          # Store multi-joueurs (cache localStorage + synchro Supabase)
│   ├── useGameState.ts        # Logique de jeu (découplée du stockage)
│   ├── useTheme.ts            # Thème clair / sombre (data-theme sur <html>)
│   └── useToast.ts            # Système de notifications
├── i18n/
│   ├── index.ts               # Config i18next (langue persistée en localStorage)
│   └── locales/
│       ├── fr.json            # Traductions françaises
│       └── en.json            # Traductions anglaises
├── lib/
│   └── supabase.ts            # Client Supabase (null si non configuré)
├── types/
│   └── index.ts               # Tous les types TypeScript
├── utils/
│   ├── file.ts                # Téléchargement / lecture de fichiers JSON
│   ├── gameLogic.ts           # XP, level up/down, resets, historique
│   ├── image.ts               # Recadrage/réduction des images importées
│   ├── initialData.ts         # Données de départ
│   └── themes.ts              # Thèmes clair / sombre + migration des anciens thèmes
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

Deux thèmes, sombre (par défaut) et clair. `useTheme` pose `data-theme` sur `<html>` et `index.css` définit les variables pour chacun :

- `--theme-bg`, `--theme-card-bg`, `--theme-outline` pour les fonds et contours ;
- `--color-bg-dark` / `--color-bg-card` en format "R G B" pour les modificateurs d'opacité Tailwind ;
- `--c-white` et `--c-gray-100` à `--c-gray-900`, branchées sur les couleurs `white` et `gray-*` de Tailwind. En clair, l'échelle est inversée : `text-white` devient le texte foncé, `border-gray-700` une bordure claire. Les composants n'ont donc pas de classes spécifiques au thème. Pour du texte blanc sur un fond coloré (boutons, badges), utiliser `text-on-accent`.

Le thème est persisté dans `renown-tracker-theme`. Les 5 anciens thèmes sombres (`ardoise`, `nuit`…) sont migrés vers le thème sombre au chargement.

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

Deux langues (FR/EN) via `react-i18next`. La langue est persistée dans `renown-tracker-lang`. Pour les contextes non-React (toasts, messages de confirmation dans `useGameState`), `i18n.t()` est importé directement depuis le module i18n.

### Historique des actions (`recordHistory`)

Plutôt que d'instrumenter chaque branche de la logique de jeu, `recordHistory(prev, next)` compare l'état avant et après une action de quête et en déduit les entrées : quêtes validées/dévalidées, changements de niveau des factions et du joueur. Le nom et l'icône de la faction sont copiés dans l'entrée pour rester lisibles si la faction est supprimée. L'historique est stocké dans `gameState.history`, du plus récent au plus ancien, limité à 500 entrées.

### Images importées (avatar et icône de faction)

`fileToSquareDataUrl` recadre l'image au centre, la réduit à 128 px et l'encode en data URL WebP (~2-10 Ko). Elle est stockée dans `Player.avatar` / `Faction.image` : pas de backend nécessaire, et l'image suit l'export/import. L'emoji reste le fallback quand aucune image n'est définie.

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

Connecté à un compte, le même format est gardé en cache sous `renown-tracker:account:<userId>`, avec en plus
la liste des profils en attente d'envoi (`pending`). Voir [docs/supabase.md](docs/supabase.md).

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
- Au reset (daily/weekly/monthly/yearly) : si la quête n'était **pas** complétée → `streakCount = 0`

Pas de champ `lastCompletedAt` — le mécanisme de reset existant suffit à détecter les jours/semaines manqués.

### Reset des quêtes

- **Daily** : reset si `lastDailyReset` est un jour différent d'aujourd'hui
- **Weekly** : reset si le dernier lundi avant `lastWeeklyReset` ≠ le dernier lundi avant maintenant
- **Monthly / Yearly** : reset si le mois / l'année de `lastMonthlyReset` / `lastYearlyReset` a changé

`applyPeriodicResets` est vérifié au montage de `useGameState`, puis toutes les minutes et au retour sur l'onglet (`visibilitychange`) : l'app peut rester ouverte après minuit sans fausser les quêtes ni les streaks.

---

## Roadmap

- [x] CRUD factions et quêtes
- [x] Système de streak
- [x] Multi-joueurs
- [x] Animations level-up (faction card + barre XP)
- [x] Thème clair / sombre
- [x] Niveau global du joueur (découplé des factions)
- [x] Lien quête journalière → hebdo (auto-incrément)
- [x] Dévalidation avec régression de niveau
- [x] Internationalisation FR/EN
- [x] Responsive mobile
- [x] Filtres et tri des quêtes, cartes repliables
- [x] Quêtes mensuelles et annuelles
- [x] Drag & drop des factions
- [x] Export/import de profil et de faction (modale dédiée depuis les paramètres)
- [x] Reset des quêtes même si l'onglet reste ouvert
- [x] Historique des actions
- [x] Image importée pour l'avatar et les icônes de faction
- [x] Outillage : config ESLint, tests unitaires de `gameLogic`, CI
- [x] Modale de confirmation à la place de `confirm()`
- [x] Comptes (Google / email) et synchronisation des profils entre appareils, hors ligne compris

---

## Licence

MIT
