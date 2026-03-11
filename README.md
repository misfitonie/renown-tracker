# 🎮 Renown Tracker

**Level Up Your Life** - Un tracker de développement personnel gamifié inspiré du système de renommées de World of Warcraft.

## 📖 Concept

Renown Tracker transforme tes objectifs de développement personnel en système de jeu RPG :

- **3 Factions** : Job 💼, Sport 💪, Culture 📚
- **Quêtes journalières et hebdomadaires** pour chaque faction
- **Système de renommée** : Gagne de l'XP pour monter de niveau dans chaque faction
- **Monnaie (💎)** : Accumulée en complétant des quêtes (récompenses à venir)
- **Persistance locale** : Tes données sont sauvegardées dans ton navigateur

## 🚀 Installation

### Prérequis
- Node.js (version 18 ou supérieure)
- npm ou yarn

### Steps

1. Clone le repo ou extrais le ZIP
```bash
cd renown-tracker
```

2. Installe les dépendances
```bash
npm install
```

3. Lance le serveur de développement
```bash
npm run dev
```

4. Ouvre ton navigateur sur `http://localhost:5173`

## 🏗️ Build pour production

```bash
npm run build
```

Les fichiers de production seront dans le dossier `dist/`.

## 📦 Déploiement

### Vercel (recommandé)

1. Push ton code sur GitHub
2. Connecte ton repo à [Vercel](https://vercel.com)
3. Deploy automatique à chaque push sur `main`

### Autres options
- Netlify
- GitHub Pages
- Cloudflare Pages

## 🎯 Utilisation

### Compléter une quête

- **Quête booléenne** : Clique sur "Valider" quand tu as terminé
- **Quête à progression** : Clique sur "+" pour incrémenter (ex: 2/5 candidatures)

### Reset automatique

- **Quêtes journalières** : Reset à minuit chaque jour
- **Quêtes hebdomadaires** : Reset le lundi à minuit

### Sauvegarde & Import/Export

- Tes données sont **automatiquement sauvegardées** dans localStorage
- **Exporter** : Télécharge un backup JSON de tes données
- **Importer** : Restaure depuis un fichier JSON
- **Reset** : Efface toutes les données (demande confirmation)

## 🛠️ Stack Technique

- **React 18** + **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **localStorage** - Persistance des données

## 📁 Structure du projet

```
renown-tracker/
├── src/
│   ├── components/      # Composants React
│   │   ├── Header.tsx
│   │   ├── FactionCard.tsx
│   │   └── QuestCard.tsx
│   ├── hooks/           # Custom hooks
│   │   └── useGameState.ts
│   ├── types/           # Types TypeScript
│   │   └── index.ts
│   ├── utils/           # Utilitaires & logique
│   │   ├── initialData.ts
│   │   └── gameLogic.ts
│   ├── App.tsx          # Composant principal
│   ├── main.tsx         # Point d'entrée
│   └── index.css        # Styles globaux
├── public/              # Assets statiques
├── index.html
└── package.json
```

## 🎨 Personnalisation

### Ajouter une faction

Édite `src/utils/initialData.ts` :

```typescript
{
  id: 'nouvelle-faction',
  name: 'Ma Faction',
  icon: '🎯',
  color: '#ff6b35',
  renownLevel: 1,
  currentXP: 0,
  xpToNextLevel: 100,
}
```

### Ajouter des quêtes

Dans `INITIAL_QUESTS` :

```typescript
{
  id: 'ma-quete-1',
  title: 'Ma quête',
  description: 'Description',
  factionId: 'nouvelle-faction',
  type: 'daily',
  xpReward: 50,
  currencyReward: 10,
  completionType: 'boolean',
  completed: false,
}
```

### Modifier la courbe d'XP

Édite `src/utils/gameLogic.ts` :

```typescript
export function getXPForNextLevel(currentLevel: number): number {
  return 100 * currentLevel; // Linéaire
  // ou
  return Math.floor(100 * Math.pow(1.5, currentLevel - 1)); // Exponentielle
}
```

## 🔮 Roadmap

- [ ] Système de récompenses débloquables avec la monnaie
- [ ] Achievements
- [ ] Statistiques et graphiques de progression
- [ ] Quêtes personnalisables (CRUD depuis l'UI)
- [ ] Mode sombre/clair
- [ ] Export PDF de statistiques
- [ ] Synchronisation cloud (optionnelle)

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésite pas à :
- Ouvrir une issue pour des bugs ou suggestions
- Proposer des pull requests
- Partager tes idées de fonctionnalités

## 📄 Licence

MIT - Fais-en ce que tu veux ! 🎉

## 👤 Auteur

Créé par Théo - [@theobotrel](https://github.com/theobotrel) (adapte avec ton vrai username GitHub)

---

**Level up et deviens la meilleure version de toi-même ! 💪🎮**
