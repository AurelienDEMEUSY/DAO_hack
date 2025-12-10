# Hand-e DAO Frontend

Interface web pour interagir avec le DAO Hand-e sur Solana.

## Description

Hand-e DAO est un DAO basé sur la réputation qui utilise deux scores pour calculer le pouvoir de vote :
- **Presence Score** : Gagné via la participation aux événements
- **Competence Score** : Gagné via l'évaluation par les pairs

Formule du pouvoir de vote : `(Presence_membre/Presence_totale) × (Competence_membre/Competence_totale)`

## Fonctionnalités

### 🏠 Dashboard
- Vue d'ensemble des scores de réputation
- Pouvoir de vote actuel
- Statistiques du DAO

### 📅 Événements
- Créer des événements
- S'inscrire/se désinscrire aux événements
- Voir l'historique des événements
- Système de pénalités (< 24h avant l'événement)

### 🗳️ Gouvernance
- Créer des propositions (Critical/Operational)
- Voter sur les propositions
- Voir l'historique des votes
- Deux types de majorité selon le type de proposition

### 👥 Membres
- Liste de tous les membres
- Classement par pouvoir de vote
- Statistiques globales du DAO

## Installation

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev

# Build pour la production
npm run build
npm start
```

## Configuration

Le frontend est configuré pour se connecter à **Solana Devnet** par défaut. Pour changer le réseau, modifiez `contexts/WalletProvider.tsx` :

```typescript
// "devnet", "testnet", or "mainnet-beta"
const endpoint = useMemo(() => clusterApiUrl("devnet"), []);
```

## Technologies

- **Next.js 16** - Framework React avec App Router
- **TypeScript** - Typage statique
- **Tailwind CSS v4** - Styling
- **shadcn/ui** - Composants UI
- **Solana Web3.js** - Interaction avec Solana
- **Anchor** - Framework Solana
- **Phantom Wallet** - Wallet Solana

## Structure du Projet

```
frontend/
├── app/                    # Pages Next.js (App Router)
│   ├── page.tsx           # Dashboard / Page d'accueil
│   ├── events/            # Page événements
│   ├── governance/        # Page gouvernance
│   └── members/           # Page membres
├── components/            # Composants React
│   ├── ui/               # Composants shadcn/ui
│   └── dao/              # Composants spécifiques au DAO
├── contexts/             # Contexts React
│   ├── WalletProvider.tsx   # Provider pour Phantom
│   └── AnchorProvider.tsx   # Provider Anchor
├── hooks/                # Custom hooks
│   └── useDao.ts         # Hook pour interagir avec le contrat
├── lib/                  # Utilitaires
│   ├── anchor/           # Types et IDL Anchor
│   │   ├── types.ts      # Types TypeScript
│   │   ├── idl.ts        # IDL import
│   │   └── dao.json      # IDL du programme
│   └── utils.ts          # Utilitaires divers
└── public/               # Assets statiques
```

## Couleurs

Le thème utilise un fond blanc avec des touches de vert (#22c55e) comme couleur principale, conformément aux spécifications :
- Background : Blanc (#ffffff)
- Primary : Vert (#22c55e)
- Accents : Nuances de vert

## Wallet

Le frontend supporte **Phantom Wallet**. Assurez-vous d'avoir l'extension Phantom installée et configurée sur Devnet.

## Développement

Le projet utilise **Hot Module Replacement** pour un développement rapide. Toute modification des fichiers déclenchera un rechargement automatique.

## Interaction avec le Contrat

Le contrat Anchor est déployé à l'adresse :
```
Program ID: 3hyf5yHncXN2rXjwezK2JxF9s9ohEGjn1GsPByKmyiUj
```

L'IDL est automatiquement synchronisé depuis `/dao/target/idl/dao.json`.

## Notes Importantes

- Les transactions nécessitent une signature wallet
- Les événements doivent être créés au moins 24h à l'avance pour éviter les pénalités
- Les propositions Critical requièrent une majorité absolue (> 50%)
- Les propositions Operational requièrent une majorité relative (pour > contre)
- Le DAO se fige si moins de 3 membres actifs
