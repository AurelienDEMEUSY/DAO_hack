***

# Fichier : `claude.md`

Copie le contenu ci-dessous dans un fichier nommé `claude.md` ou `specs.md` à la racine de ton projet. Ensuite, dis à ton IA : *"Base-toi sur le fichier claude.md pour générer le code du programme Anchor."*

```markdown
# Hand-e DAO: Technical Specification & Architecture

## 1. Project Overview
**Context:** Implementation of a Reputation-based DAO on Solana using the Anchor Framework.
**Goal:** Manage governance, event attendance, reputation scoring, and automatic slashing based on strict time rules.
**Core Concept:** Voting power is not linear; it is derived from two metrics: **Presence** and **Competence**.

## 2. Constants & Configuration

- **SCALING_FACTOR**: `1_000_000_000` (10^9) - Used to handle precision for scores.
- **MIN_QUORUM**: `3` - "Kill Switch" threshold. If active members < 3, DAO shuts down.
- **GENESIS_TOKENS**: `3 * SCALING_FACTOR` - Initial Presence score for founders.
- **DEFAULT_COMPETENCE**: `10 * SCALING_FACTOR` - Initial Competence score.
- **SLOT_DURATION**: `24 * 60 * 60` (86400 seconds) - The "24h" window defined in specs.

## 3. Data Structures (Accounts)

### 3.1 Global State (`State`)
*Singleton PDA seeds=["state"]*
| Field | Type | Description |
|-------|------|-------------|
| `admin` | `Pubkey` | The initial deployer/admin key. |
| `total_presence` | `u64` | Denominator for Presence (Sum of all members). |
| `total_competence` | `u64` | Denominator for Competence (Sum of all members). |
| `active_members` | `u16` | Count of members with Voting Power > 0. |
| `is_active` | `bool` | True by default. False if Kill Switch triggered. |
| `event_counter` | `u64` | To ID events uniquely. |

### 3.2 Member Profile (`Member`)
*PDA seeds=["member", authority_pubkey]*
| Field | Type | Description |
|-------|------|-------------|
| `authority` | `Pubkey` | Wallet address of the member. |
| `is_genesis` | `bool` | True if part of the hackathon winning team. |
| `presence_score` | `u64` | Accumulator of "Jeton de Présence". |
| `competence_score` | `u64` | Accumulator of "Jeton de Compétence". |
| `joined_at` | `i64` | Timestamp of entry. |

### 3.3 Event / Track (`TrackSession`)
*PDA seeds=["track", event_id]*
| Field | Type | Description |
|-------|------|-------------|
| `id` | `u64` | Unique ID. |
| `start_time` | `i64` | ($T_{event}$) Unix timestamp of the meetup start. |
| `subject` | `String` | Topic of the session. |
| `status` | `Enum` | `Scheduled`, `Completed`, `Cancelled`. |

### 3.4 Proposal (`Proposal`)
*PDA seeds=["proposal", proposal_id]*
| Field | Type | Description |
|-------|------|-------------|
| `id` | `u64` | Unique ID. |
| `creator` | `Pubkey` | Member who proposed. |
| `type` | `Enum` | `Critical` (Cooptation, Ban) or `Operational` (Subject, Date). |
| `votes_for` | `u128` | Accumulated Weighted Voting Power. |
| `votes_against` | `u128` | Accumulated Weighted Voting Power. |
| `total_power_snapshot`| `u128` | The Global Total Voting Power at the moment of creation. |
| `deadline` | `i64` | When voting closes. |
| `executed` | `bool` | Prevent double execution. |

## 4. Business Logic & Instructions

### 4.1 Initialization (Bootstrap)
- **Function:** `initialize`
- **Logic:** Set `active_members = 0`, `is_active = true`.
- **Function:** `add_genesis_member`
- **Constraint:** Can only be called if `active_members` < 3 (during bootstrap).
- **Action:** Initialize `Member` account. Set `presence_score = 3 * SCALING_FACTOR`.

### 4.2 Registration & Slashing (The "Malus" System)
*Ref: PDF Page 4 - Table of Sanctions*

- **Function:** `register_for_event`
- **Inputs:** `event_id`.
- **Logic:**
    1. Get `current_time` (Clock).
    2. Get `event_start` ($T_{event}$).
    3. **Check Malus:**
       - If `current_time > (event_start - 24h)`:
         - This is **"Inscription Tardive"**.
         - **Action:** `member.presence_score -= 1 * SCALING_FACTOR`.
         - Update `state.total_presence`.
    4. Create a `Registration` marker account.

- **Function:** `withdraw_registration` (Désistement)
- **Logic:**
    1. If `current_time > (event_start - 24h)`:
       - This is **"Désistement Prévenu (Tardif/Ghosting risk)"**.
       - Note: PDF implies "Désistement Prévenu" is ok unless it's ghosting, but strict logic suggests any action close to event carries risk. *Implementation decision: If withdraw < 24h before, Apply Malus -1.*

### 4.3 Post-Event Settlement (Minting & Ghosting)
- **Function:** `settle_event` (Admin or Oracle call)
- **Logic:**
    1. Iterate over list of attendees (passed as argument or via separate evidence).
    2. **For Present Members:**
       - `member.presence_score += 1 * SCALING_FACTOR`.
       - `member.competence_score += peer_review_score`.
    3. **For "Ghosting" (Registered but Not Present):**
       - Apply **"Ghosting"** Malus: `member.presence_score -= 2 * SCALING_FACTOR`.
    4. **For "Oubli" (Present but Not Registered):**
       - Apply **"Oubli"** Malus: `member.presence_score -= 2 * SCALING_FACTOR`.

### 4.4 Voting Power Algorithm
*Ref: PDF Page 4*
Solidity/Anchor cannot handle floats. We use integer math with scaling.

**Formula:**
$$ S_{member} = \left( \frac{Pres_{member}}{Pres_{total}} \right) \times \left( \frac{Comp_{member}}{Comp_{total}} \right) $$

**Rust Implementation:**
```rust
fn calculate_voting_weight(member: &Member, state: &State) -> u128 {
    let p_m = member.presence_score as u128;
    let c_m = member.competence_score as u128;
    let p_tot = state.total_presence as u128;
    let c_tot = state.total_competence as u128;

    // Weight = (Pm * Cm * SCALING_FACTOR) / (Ptot * Ctot)
    // We multiply by scalar first to keep precision
    let numerator = p_m.checked_mul(c_m).unwrap().checked_mul(SCALING_FACTOR_U128).unwrap();
    let denominator = p_tot.checked_mul(c_tot).unwrap();
    
    if denominator == 0 { return 0; }
    numerator / denominator
}
```

### 4.5 Governance Rules
*Ref: PDF Page 2*

- **Critical Actions (Cooptation, Ban):**
  - Success Condition: `votes_for > (state.total_power_snapshot / 2)` (Absolute Majority).
- **Operational Actions:**
  - Success Condition: `votes_for > votes_against` (Relative Majority).

### 4.6 Safety: Kill Switch
- **Modifier:** `check_active`
- **Logic:** inside every instruction, check:
  ```rust
  if state.active_members < 3 && state.genesis_complete {
      return Err(ErrorCode::DaoShutdown.into());
  }
  ```

## 5. Error Codes

| Code | Name | Description |
|------|------|-------------|
| 6000 | `DaoShutdown` | Active members < 3. DAO is frozen. |
| 6001 | `TooLateToRegister` | Event already started. |
| 6002 | `GenesisClosed` | Cannot add genesis members after initialization. |
| 6003 | `InsufficientReputation` | Voting power too low to propose. |
| 6004 | `SlashingOverflow` | User has 0 tokens, cannot slash further. |

## 6. Implementation Plan (Steps for AI)
1.  Define `State` and `Member` structs with correct PDA seeds.
2.  Implement `initialize` and `add_genesis_member` to handle the "3 initial tokens".
3.  Implement `register` with the time-check logic (`Clock::get()`).
4.  Implement the `calculate_voting_weight` helper function using `u128`.
5.  Implement `cast_vote` utilizing the helper function.
6.  Add the `check_kill_switch` logic to critical instructions.
```

***

### Comment utiliser ce fichier ?

1.  **Création :** Crée le fichier `claude.md` dans ton dossier de projet.
2.  **Prompt à l'IA (dans Cursor, Windsurf ou VS Code avec Copilot/Claude) :**

> "Agis en tant qu'expert Solana Anchor. J'ai défini l'architecture complète de la DAO dans le fichier `claude.md` ci-joint.
>
> Je veux que tu génères le code Rust pour le fichier `lib.rs` du framework Anchor.
>
> **Contraintes importantes :**
> 1. Suis strictement les structures de données (Accounts) définies.
> 2. Implémente la logique de Slashing dans la fonction d'inscription (`register`).
> 3. Utilise `u128` pour les calculs de Voting Power pour éviter les overflows.
> 4. N'oublie pas la clause 'Kill Switch' au début des instructions."

Ce fichier agit comme un cahier des charges irréfutable pour l'IA, garantissant que le code généré respecte à la lettre les spécificités mathématiques et temporelles de ta DAO.