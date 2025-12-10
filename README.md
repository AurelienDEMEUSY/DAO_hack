# Hand-e DAO - Reputation-Based Governance on Solana

DAO basée sur la réputation utilisant Solana et Anchor Framework. Le pouvoir de vote dérive de deux dimensions : **Présence** (assiduité aux événements) et **Compétence** (évaluation par les pairs).

## 📋 Prérequis

- **Solana CLI** (>= 1.18.0)
- **Anchor CLI** (>= 0.32.0)
- **Rust** (>= 1.75.0)
- **Node.js** (>= 18.0.0) et **Yarn**

### Installation des outils

```bash
# Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.32.1
avm use 0.32.1

# Vérifier les installations
solana --version
anchor --version
```

## 🚀 Déploiement sur Devnet

### 1. Configuration du wallet

```bash
# Créer un wallet si vous n'en avez pas
solana-keygen new --outfile ~/.config/solana/id.json

# Vérifier votre adresse
solana address

# Configurer le cluster devnet
solana config set --url devnet

# Obtenir des SOL de test (airdrop)
solana airdrop 2
```

### 2. Build et déploiement

```bash
# Naviguer dans le dossier dao
cd dao/

# Build le programme
anchor build

# Déployer sur devnet
anchor deploy

# Note : Le program ID sera affiché. Si différent de celui dans Anchor.toml,
# mettez à jour lib.rs:3 et Anchor.toml:12 avec le nouveau ID
```

### 3. Vérifier le déploiement

```bash
# Vérifier que le programme est bien déployé
solana program show Ft54i1cMxhkD5pvxMHfmzW8quwPZRPVQRTcqMFLXqYzi
```

## 🧪 Tests Manuels sur Devnet

### Préparation : Installer les dépendances de test

```bash
cd dao/
yarn install  # ou npm install
```

### Test 1 : Initialisation et Membres Genèse

**Objectif** : Créer le DAO et ajouter 3 membres fondateurs

```bash
# Lancer le test d'initialisation
cd tests/
cargo test test_initialize -- --nocapture

# Lancer le test des membres genèse
cargo test test_add_genesis_members -- --nocapture
```

**Vérifications attendues** :
- ✅ État du DAO créé avec `active_members = 0`
- ✅ 3 membres genèse ajoutés avec scores initiaux :
  - Présence : 3 × 10⁹
  - Compétence : 10 × 10⁹
- ✅ Rejet du 4ème membre genèse (erreur `GenesisClosed`)

**Vérifier manuellement sur Devnet** :
```bash
# Obtenir l'adresse du State PDA
solana-keygen grind --starts-with state:1

# Voir les données du compte State
solana account <STATE_PDA_ADDRESS>
```

### Test 2 : Création et Gestion d'Événements

**Objectif** : Créer un événement, s'inscrire, et enregistrer l'assiduité

```bash
cargo test test_events -- --nocapture
```

**Scénarios testés** :
1. **Inscription normale** (>24h avant)
   - Présence : Pas de pénalité
   - Participation : +1 × 10⁹

2. **Inscription tardive** (<24h avant)
   - Pénalité : -1 × 10⁹
   - Si présent : +1 × 10⁹ (net = 0)

3. **Retrait tardif** (<24h avant)
   - Pénalité : -1 × 10⁹

4. **Ghosting** (inscrit mais absent)
   - Pénalité : -2 × 10⁹

5. **Oubli** (présent mais non inscrit)
   - Pénalité : -2 × 10⁹

**Commandes manuelles** :
```bash
# Créer un événement (via script Node.js - à créer)
anchor run create-event

# S'inscrire à l'événement
anchor run register-event

# Enregistrer l'assiduité
anchor run record-attendance
```

### Test 3 : Système de Gouvernance

**Objectif** : Créer et voter sur des propositions

```bash
cargo test test_proposals -- --nocapture
```

**Types de propositions** :

#### A. Propositions Critiques (majorité absolue >50%)
- Cooptation de nouveaux membres
- Bannissement de membres
- **Seuil** : `votes_for > total_power_snapshot / 2`

#### B. Propositions Opérationnelles (majorité relative)
- Choix de sujets d'événements
- Dates de réunions
- **Seuil** : `votes_for > votes_against`

**Formule de calcul du poids de vote** :
```
voting_weight = (presence_membre / presence_totale) × (competence_membre / competence_totale) × 10⁹
```

**Exemple avec 3 membres genèse égaux** :
```
Présence membre = 3 × 10⁹, Total = 9 × 10⁹
Compétence membre = 10 × 10⁹, Total = 30 × 10⁹

Poids = (3/9) × (10/30) × 10⁹ = 10⁹/9 ≈ 111 111 111 (11.11%)
```

### Test 4 : Kill Switch (Seuil de Quorum)

**Objectif** : Vérifier que le DAO se gèle si <3 membres actifs

**Scénario** :
1. ✅ Créer 3 membres genèse
2. ✅ Bannir 1 membre → DAO continue (2 membres)
3. ⚠️ Bannir 1 autre membre → **DAO gelé** (1 membre < MIN_QUORUM)
4. ❌ Toutes les opérations retournent `ErrorCode::DaoShutdown`

```bash
# Tester le kill switch
cargo test test_kill_switch -- --nocapture
```

## 📊 Vérification des Comptes sur Devnet

### Dériver les adresses PDA

```bash
# State (singleton)
# Seeds: ["state"]

# Member
# Seeds: ["member", <MEMBER_AUTHORITY_PUBKEY>]

# Event (TrackSession)
# Seeds: ["track", <EVENT_ID_U64_LE_BYTES>]

# Registration
# Seeds: ["registration", <EVENT_ID_U64_LE_BYTES>, <MEMBER_AUTHORITY_PUBKEY>]

# Proposal
# Seeds: ["proposal", <PROPOSAL_ID_U64_LE_BYTES>]

# VoteRecord
# Seeds: ["vote", <PROPOSAL_ID_U64_LE_BYTES>, <VOTER_PUBKEY>]
```

### Utiliser Solana Explorer

Accéder à [Solana Explorer (Devnet)](https://explorer.solana.com/?cluster=devnet) et rechercher :
- Program ID : `Ft54i1cMxhkD5pvxMHfmzW8quwPZRPVQRTcqMFLXqYzi`
- Vos PDAs dérivés

## 🔧 Commandes Utiles

```bash
# Voir les logs du programme
solana logs Ft54i1cMxhkD5pvxMHfmzW8quwPZRPVQRTcqMFLXqYzi

# Vérifier le solde du wallet
solana balance

# Obtenir plus de SOL test
solana airdrop 2

# Changer de cluster
solana config set --url localnet   # Pour tests locaux
solana config set --url devnet     # Pour devnet
solana config set --url mainnet-beta # ⚠️ Mainnet (NE PAS UTILISER pour tests)

# Build et redéployer après modifications
anchor build && anchor deploy

# Lancer les tests d'intégration
anchor test --skip-local-validator  # Utilise devnet configuré
```

## 📖 Architecture du Projet

```
dao/
├── programs/dao/src/
│   └── lib.rs              # Programme Anchor principal (1227 lignes)
│       ├── Constants       # Facteurs d'échelle, pénalités, durées
│       ├── Instructions    # Logique métier (15 instructions)
│       ├── Helpers         # Calcul du poids de vote
│       ├── Accounts        # Structures de données (PDAs)
│       └── Contexts        # Validations de comptes
│
├── tests/src/
│   ├── test_initialize.rs          # Initialisation du DAO
│   ├── test_genesis_members.rs     # Membres fondateurs
│   ├── test_events.rs              # Gestion d'événements
│   └── test_proposals.rs           # Gouvernance
│
├── Anchor.toml             # Configuration (devnet)
├── Cargo.toml              # Dépendances Rust
└── package.json            # Dépendances Node.js
```

## 🛡️ Mécanismes de Sécurité

### 1. Kill Switch
- DAO gelé si `active_members < 3`
- Vérifié dans toutes les instructions critiques

### 2. Temporal Slashing (24h)
- Pénalités pour inscriptions/retraits tardifs
- Double pénalité pour ghosting/oubli

### 3. Checked Arithmetic
- Toutes les opérations utilisent `.checked_*()` pour éviter les overflows
- Protection contre le slashing en dessous de 0

### 4. Snapshot de Pouvoir de Vote
- Pouvoir total figé à la création de proposition
- Empêche la manipulation du quorum pendant le vote

## 🐛 Dépannage

### Erreur : "Insufficient funds"
```bash
solana airdrop 2
```

### Erreur : "Program already deployed"
```bash
# Récupérer les frais de rent
solana program close Ft54i1cMxhkD5pvxMHfmzW8quwPZRPVQRTcqMFLXqYzi

# Redéployer
anchor deploy
```

### Erreur : "Error code 6000" (DaoShutdown)
Le DAO est gelé car `active_members < 3`. Réinitialisez avec 3 membres genèse.

### Les tests échouent
```bash
# Assurez-vous d'être sur devnet
solana config get

# Vérifiez que vous avez assez de SOL
solana balance

# Rebuild
anchor build
```

## 📝 Constantes Importantes

| Constante | Valeur | Description |
|-----------|--------|-------------|
| `SCALING_FACTOR` | 10⁹ | Précision des scores (9 décimales) |
| `MIN_QUORUM` | 3 | Seuil de kill switch |
| `MAX_GENESIS_MEMBERS` | 3 | Limite de membres fondateurs |
| `SLOT_DURATION` | 86400s | Fenêtre de 24h pour le slashing |
| `GENESIS_PRESENCE` | 3 × 10⁹ | Score initial de présence (genèse) |
| `GENESIS_COMPETENCE` | 10 × 10⁹ | Score initial de compétence (genèse) |
| `LATE_PENALTY` | 1 × 10⁹ | Pénalité pour retard |
| `GHOSTING_PENALTY` | 2 × 10⁹ | Pénalité pour absence non excusée |
| `ATTENDANCE_REWARD` | 1 × 10⁹ | Récompense pour présence |

## 📄 Licence

MIT

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

---

**Program ID (Devnet)** : `Ft54i1cMxhkD5pvxMHfmzW8quwPZRPVQRTcqMFLXqYzi`
