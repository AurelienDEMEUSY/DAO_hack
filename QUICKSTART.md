# Guide de Démarrage Rapide - Devnet

## 🚀 Déploiement en 5 minutes

### 1. Configuration initiale

```bash
# Configurer le cluster devnet
solana config set --url devnet

# Obtenir des SOL de test
solana airdrop 2

# Vérifier le solde
solana balance
```

### 2. Build et déploiement

```bash
cd dao/

# Build le programme
anchor build

# Déployer sur devnet
anchor deploy
```

**Note** : Si le program ID change, mettez à jour :
- `dao/programs/dao/src/lib.rs` ligne 3 : `declare_id!("NOUVEAU_ID");`
- `dao/Anchor.toml` ligne 12 : `dao = "NOUVEAU_ID"`

Puis rebuild et redéployez :
```bash
anchor build
anchor deploy
```

### 3. Tests rapides

```bash
# Test d'initialisation
cd tests/
cargo test test_initialize -- --nocapture

# Test des membres genèse
cargo test test_add_genesis_members -- --nocapture

# Tous les tests unitaires
cargo test -- --nocapture
```

## 📊 Vérifier le déploiement

### Sur Solana Explorer
1. Allez sur https://explorer.solana.com/?cluster=devnet
2. Recherchez : `Ft54i1cMxhkD5pvxMHfmzW8quwPZRPVQRTcqMFLXqYzi`
3. Vérifiez les transactions

### En ligne de commande
```bash
# Voir le programme déployé
solana program show Ft54i1cMxhkD5pvxMHfmzW8quwPZRPVQRTcqMFLXqYzi

# Suivre les logs en temps réel
solana logs Ft54i1cMxhkD5pvxMHfmzW8quwPZRPVQRTcqMFLXqYzi
```

## 🧪 Scénario de test complet

### Étape 1 : Initialiser le DAO
```bash
cargo test test_initialize -- --nocapture
```
**Résultat attendu** : State PDA créé avec 0 membres

### Étape 2 : Ajouter 3 membres genèse
```bash
cargo test test_add_genesis_members -- --nocapture
```
**Résultat attendu** :
- 3 membres avec 3×10⁹ présence, 10×10⁹ compétence
- Rejet du 4ème membre (erreur `GenesisClosed`)

### Étape 3 : Tester les événements
```bash
cargo test test_attendance_scenarios -- --nocapture
```
**Scénarios** :
- ✅ Présent + Inscrit = +1 présence
- ❌ Ghosting = -2 présence
- ❌ Oubli = -2 présence

### Étape 4 : Tester la gouvernance
```bash
cargo test test_critical_proposal_majority -- --nocapture
cargo test test_operational_proposal_majority -- --nocapture
```
**Règles** :
- Critique : >50% du pouvoir total
- Opérationnel : FOR > AGAINST

## 🛠️ Commandes utiles

```bash
# Rechargez des SOL si nécessaire
solana airdrop 2

# Changer de cluster
solana config set --url localnet   # Pour tests locaux
solana config set --url devnet     # Pour devnet

# Rebuild rapide
anchor build

# Redéployer
anchor deploy

# Fermer le programme (récupère les frais)
solana program close Ft54i1cMxhkD5pvxMHfmzW8quwPZRPVQRTcqMFLXqYzi
```

## 📝 Constantes clés

| Constante | Valeur | Description |
|-----------|--------|-------------|
| `SCALING_FACTOR` | 10⁹ | Facteur de précision |
| `MIN_QUORUM` | 3 | Seuil de kill switch |
| `SLOT_DURATION` | 24h | Fenêtre de slashing |
| `GENESIS_PRESENCE` | 3×10⁹ | Score initial présence |
| `GENESIS_COMPETENCE` | 10×10⁹ | Score initial compétence |

## 🐛 Résolution de problèmes

### Erreur : "Insufficient funds"
```bash
solana airdrop 2
```

### Erreur : "Account already exists"
Le State PDA existe déjà. Utilisez un nouveau wallet ou fermez le programme :
```bash
solana program close Ft54i1cMxhkD5pvxMHfmzW8quwPZRPVQRTcqMFLXqYzi
```

### Erreur : "Error 6000 - DaoShutdown"
Le DAO est gelé (<3 membres actifs). Réinitialisez avec 3 membres genèse.

### Les tests échouent
```bash
# Vérifiez le cluster
solana config get

# Vérifiez ANCHOR_WALLET
echo $ANCHOR_WALLET

# Définissez-le si nécessaire
export ANCHOR_WALLET=~/.config/solana/id.json
```

## 📖 Documentation complète

Pour plus de détails, consultez [README.md](./README.md)

---

**Program ID** : `Ft54i1cMxhkD5pvxMHfmzW8quwPZRPVQRTcqMFLXqYzi`
**Cluster** : Devnet
**Explorer** : https://explorer.solana.com/?cluster=devnet
