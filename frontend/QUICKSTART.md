# 🚀 Guide de démarrage rapide - Hand-e DAO

## Ordre d'utilisation du DAO

### ⚠️ IMPORTANT : Étapes obligatoires dans l'ordre

Le DAO **DOIT** être utilisé dans cet ordre exact, sinon il sera gelé :

### 1️⃣ **Initialiser le DAO** (Une seule fois)
- Connectez votre wallet Phantom
- Allez sur la page d'accueil
- Cliquez sur "Initialize DAO"
- ✅ Le DAO est maintenant créé avec 0 membres

### 2️⃣ **Ajouter 3 membres Genesis** (Requis minimum)
- Sur la page d'accueil, cliquez sur "Become Genesis Member"
- **Répétez cette opération avec 3 wallets différents**
- Chaque membre genesis reçoit :
  - Presence Score : 3.00
  - Competence Score : 10.00
- ✅ Le DAO est maintenant dégelé avec 3 membres actifs

### 3️⃣ **Utiliser les fonctionnalités** (Après avoir 3+ membres)

Une fois que vous avez **minimum 3 membres actifs**, vous pouvez :

#### 📅 Créer des événements
- Allez sur `/events`
- Cliquez sur "Create Event"
- Sélectionnez une date/heure (minimum 24h dans le futur pour éviter les pénalités)
- Ajoutez une description

#### ✅ S'inscrire aux événements
- Sur la page Events
- Cliquez sur "Register" pour un événement à venir
- **Attention** : S'inscrire < 24h avant = pénalité de -1 présence

#### 🗳️ Créer des propositions
- Allez sur `/governance`
- Cliquez sur "Create Proposal"
- Choisissez le type :
  - **Critical** : Cooptation/Ban de membres (majorité absolue > 50% requise)
  - **Operational** : Sujets/dates (majorité relative requise)

#### 👍 Voter
- Sur la page Governance
- Cliquez sur "Vote For" ou "Vote Against"
- Votre pouvoir de vote = `(Votre Presence/Total) × (Votre Competence/Total)`

## 🔴 Erreurs communes

### `DaoShutdown: DAO is frozen: less than 3 active members`

**Cause** : Vous essayez de créer un événement/proposition mais le DAO a moins de 3 membres actifs.

**Solution** :
1. Retournez sur la page d'accueil
2. Ajoutez des membres genesis (jusqu'à 3 maximum)
3. Ou utilisez la gouvernance pour coopter de nouveaux membres si les 3 places genesis sont prises

### `Hydration failed because the server rendered HTML didn't match the client`

**Cause** : Problème de rendu SSR/CSR avec le bouton wallet (corrigé dans les dernières modifications)

**Solution** : Rafraîchissez la page (F5). Le composant WalletButton a été mis à jour pour éviter ce problème.

## 📊 Système de scores

### Presence Score
- **+1** : Participer à un événement
- **-1** : Inscription/retrait tardif (< 24h avant l'événement)
- **-2** : Ghosting (inscrit mais absent)
- **-2** : Oubli (présent mais pas inscrit)

### Competence Score
- Modifié via peer review (fonction `update_competence`)
- Les membres s'évaluent entre eux

### Voting Power
Formule : `(Presence_membre/Presence_totale) × (Competence_membre/Competence_totale)`

Plus vous avez de présence ET de compétence, plus votre pouvoir de vote est élevé.

## 🎯 Workflow recommandé

1. ✅ Initialize DAO (admin)
2. ✅ Add 3 genesis members (3 wallets différents)
3. 📅 Create upcoming events
4. 📝 Create first operational proposal
5. 👥 Vote on proposal
6. 🔄 Repeat: events → attendance → reputation growth

## 🔗 Liens utiles

- **Devnet Explorer** : https://explorer.solana.com/?cluster=devnet
- **Program ID** : `3hyf5yHncXN2rXjwezK2JxF9s9ohEGjn1GsPByKmyiUj`
- **Get Devnet SOL** : https://faucet.solana.com/

## 💡 Tips

- Gardez toujours au moins 3 membres actifs
- Créez des événements au moins 24h à l'avance
- Les propositions Critical sont pour les décisions importantes (membres)
- Les propositions Operational sont pour les décisions courantes
- Le pouvoir de vote est dynamique : assistez aux événements pour le faire grandir !
