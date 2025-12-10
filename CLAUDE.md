# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Hand-e DAO** - Reputation-based DAO on Solana using Anchor Framework for event attendance tracking and governance with automatic slashing mechanics.

**Core Concept:** Voting power derives from **Presence** (attendance) and **Competence** (peer review) scores using non-linear formula: `S_member = (Pres_member/Pres_total) × (Comp_member/Comp_total)`

## Development Commands

### Building & Testing
```bash
# From dao/ directory
anchor build                    # Build the program
anchor test                     # Run tests (includes build + deploy to localnet)
cargo test                      # Run Rust unit tests only
yarn lint                       # Check code formatting
yarn lint:fix                   # Fix formatting issues
```

### Running Single Test
```bash
cd dao/tests
cargo test test_initialize      # Run specific test by name
```

### Local Deployment
```bash
anchor localnet                 # Start local validator
anchor deploy                   # Deploy to localnet
```

## Architecture

### Project Structure
- `dao/programs/dao/src/lib.rs` - Main Anchor program (currently scaffold only)
- `dao/tests/src/` - Integration tests using anchor-client
- Program ID: `Ft54i1cMxhkD5pvxMHfmzW8quwPZRPVQRTcqMFLXqYzi` (localnet)

### Key Data Structures (PDAs)

**State** `["state"]` - Global singleton
- Tracks `total_presence`, `total_competence` (denominators for voting power)
- `active_members` counter for kill switch (DAO freezes if < 3)
- `event_counter` for event IDs

**Member** `["member", authority_pubkey]`
- `presence_score` / `competence_score` (u64, scaled by 10^9)
- Genesis members start with `3 * SCALING_FACTOR` presence, `10 * SCALING_FACTOR` competence

**TrackSession** `["track", event_id]` - Events/meetups
- `start_time` critical for 24h slashing window

**Proposal** `["proposal", proposal_id]`
- `votes_for` / `votes_against` (u128 for voting power)
- Critical vs Operational types (different majority rules)

### Critical Constants
```rust
const SCALING_FACTOR: u64 = 1_000_000_000;  // 10^9 for precision
const MIN_QUORUM: u16 = 3;                   // Kill switch threshold
const SLOT_DURATION: i64 = 86400;            // 24h in seconds
```

## Business Logic Constraints

### Time-Based Slashing (24h Window)
All event-related actions use `Clock::get()` to check against `event.start_time`:
- **Late registration** (< 24h before): -1 presence
- **Late withdrawal** (< 24h before): -1 presence
- **Ghosting** (registered, absent): -2 presence
- **Oubli** (present, not registered): -2 presence

### Voting Power Calculation
Use `u128` to prevent overflow:
```rust
fn calculate_voting_weight(member: &Member, state: &State) -> u128 {
    let numerator = (p_m * c_m * SCALING_FACTOR) as u128;
    let denominator = (p_tot * c_tot) as u128;
    numerator / denominator  // Returns 0 if denom = 0
}
```

### Kill Switch
Every critical instruction must check:
```rust
if state.active_members < 3 {
    return Err(ErrorCode::DaoShutdown.into());
}
```

### Governance Rules
- **Critical proposals** (cooptation, ban): Need `votes_for > total_power_snapshot / 2` (absolute majority)
- **Operational proposals** (subjects, dates): Need `votes_for > votes_against` (relative majority)

## Implementation Notes

- All score updates must also update `state.total_presence` / `state.total_competence`
- Genesis member initialization restricted to first 3 members only
- Use `checked_mul()` / `checked_sub()` for arithmetic to handle edge cases
- Store `total_power_snapshot` when creating proposals (to handle changing membership)

## Error Codes (6000+)
- `DaoShutdown` (6000) - Active members < 3
- `TooLateToRegister` (6001) - Event already started
- `GenesisClosed` (6002) - Cannot add >3 genesis members
- `InsufficientReputation` (6003) - Voting power too low
- `SlashingOverflow` (6004) - Cannot slash member with 0 tokens
