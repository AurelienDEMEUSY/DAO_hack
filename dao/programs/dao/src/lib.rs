use anchor_lang::prelude::*;

declare_id!("3hyf5yHncXN2rXjwezK2JxF9s9ohEGjn1GsPByKmyiUj");

// ============================================================================
// CONSTANTS
// ============================================================================

/// Scaling factor for score precision (10^9)
pub const SCALING_FACTOR: u64 = 1_000_000_000;

/// Minimum number of active members before DAO freezes (kill switch)
pub const MIN_QUORUM: u8 = 3;

/// Maximum number of genesis members allowed
pub const MAX_GENESIS_MEMBERS: u8 = 3;

/// Time slot duration in seconds (24 hours)
pub const SLOT_DURATION: i64 = 86400;

/// Initial presence score for genesis members (3 * SCALING_FACTOR)
pub const GENESIS_PRESENCE: u64 = 3 * SCALING_FACTOR;

/// Initial competence score for genesis members (10 * SCALING_FACTOR)
pub const GENESIS_COMPETENCE: u64 = 10 * SCALING_FACTOR;

/// Presence penalty for late registration or late withdrawal
pub const LATE_PENALTY: u64 = 1 * SCALING_FACTOR;

/// Presence penalty for ghosting (registered but absent)
pub const GHOSTING_PENALTY: u64 = 2 * SCALING_FACTOR;

/// Presence penalty for "oubli" (present but not registered)
pub const OUBLI_PENALTY: u64 = 2 * SCALING_FACTOR;

/// Presence reward for attending an event
pub const ATTENDANCE_REWARD: u64 = 1 * SCALING_FACTOR;

// ============================================================================
// PROGRAM
// ============================================================================

#[program]
pub mod dao {
    use super::*;

    /// Initialize the DAO state (singleton)
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.authority = ctx.accounts.authority.key();
        state.total_presence = 0;
        state.total_competence = 0;
        state.active_members = 0;
        state.genesis_count = 0;
        state.event_counter = 0;
        state.proposal_counter = 0;
        state.bump = ctx.bumps.state;
        
        msg!("DAO initialized by: {:?}", state.authority);
        Ok(())
    }

    /// Add a genesis member (maximum 3 allowed)
    pub fn add_genesis_member(ctx: Context<AddGenesisMember>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        
        // Check genesis limit
        require!(
            state.genesis_count < MAX_GENESIS_MEMBERS,
            ErrorCode::GenesisClosed
        );

        let member = &mut ctx.accounts.member;
        member.authority = ctx.accounts.member_authority.key();
        member.presence_score = GENESIS_PRESENCE;
        member.competence_score = GENESIS_COMPETENCE;
        member.is_active = true;
        member.is_genesis = true;
        member.joined_at = Clock::get()?.unix_timestamp;
        member.bump = ctx.bumps.member;

        // Update global state
        state.total_presence = state.total_presence.checked_add(GENESIS_PRESENCE)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        state.total_competence = state.total_competence.checked_add(GENESIS_COMPETENCE)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        state.active_members = state.active_members.checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        state.genesis_count = state.genesis_count.checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        msg!("Genesis member added: {:?}", member.authority);
        Ok(())
    }

    /// Create a new event/track session
    pub fn create_event(
        ctx: Context<CreateEvent>,
        start_time: i64,
        description: String,
    ) -> Result<()> {
        let state = &mut ctx.accounts.state;
        
        // Kill switch check
        require!(
            state.active_members >= MIN_QUORUM,
            ErrorCode::DaoShutdown
        );

        let current_time = Clock::get()?.unix_timestamp;
        require!(start_time > current_time, ErrorCode::InvalidEventTime);

        let event = &mut ctx.accounts.event;
        event.id = state.event_counter;
        event.creator = ctx.accounts.creator.key();
        event.start_time = start_time;
        event.description = description;
        event.is_finalized = false;
        event.registered_count = 0;
        event.attended_count = 0;
        event.bump = ctx.bumps.event;

        state.event_counter = state.event_counter.checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        msg!("Event {} created, starts at: {}", event.id, start_time);
        Ok(())
    }

    /// Register for an event (with late penalty if < 24h before)
    pub fn register_for_event(ctx: Context<RegisterForEvent>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        
        // Kill switch check
        require!(
            state.active_members >= MIN_QUORUM,
            ErrorCode::DaoShutdown
        );

        let event = &mut ctx.accounts.event;
        require!(!event.is_finalized, ErrorCode::EventAlreadyFinalized);

        let current_time = Clock::get()?.unix_timestamp;
        require!(current_time < event.start_time, ErrorCode::EventAlreadyStarted);

        let registration = &mut ctx.accounts.registration;
        let member = &mut ctx.accounts.member;

        // Check if registering late (< 24h before event)
        let time_until_event = event.start_time.checked_sub(current_time)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        
        if time_until_event < SLOT_DURATION {
            // Late registration penalty
            let penalty = LATE_PENALTY.min(member.presence_score);
            member.presence_score = member.presence_score.checked_sub(penalty)
                .ok_or(ErrorCode::SlashingOverflow)?;
            state.total_presence = state.total_presence.checked_sub(penalty)
                .ok_or(ErrorCode::SlashingOverflow)?;
            msg!("Late registration penalty applied: -{}", penalty);
        }

        registration.member = member.authority;
        registration.event_id = event.id;
        registration.is_registered = true;
        registration.has_attended = false;
        registration.registered_at = current_time;
        registration.bump = ctx.bumps.registration;

        event.registered_count = event.registered_count.checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        msg!("Member {:?} registered for event {}", member.authority, event.id);
        Ok(())
    }

    /// Withdraw from an event (with late penalty if < 24h before)
    pub fn withdraw_from_event(ctx: Context<WithdrawFromEvent>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        
        // Kill switch check
        require!(
            state.active_members >= MIN_QUORUM,
            ErrorCode::DaoShutdown
        );

        let event = &mut ctx.accounts.event;
        require!(!event.is_finalized, ErrorCode::EventAlreadyFinalized);

        let current_time = Clock::get()?.unix_timestamp;
        require!(current_time < event.start_time, ErrorCode::EventAlreadyStarted);

        let registration = &mut ctx.accounts.registration;
        let member = &mut ctx.accounts.member;

        require!(registration.is_registered, ErrorCode::NotRegistered);

        // Check if withdrawing late (< 24h before event)
        let time_until_event = event.start_time.checked_sub(current_time)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        
        if time_until_event < SLOT_DURATION {
            // Late withdrawal penalty
            let penalty = LATE_PENALTY.min(member.presence_score);
            member.presence_score = member.presence_score.checked_sub(penalty)
                .ok_or(ErrorCode::SlashingOverflow)?;
            state.total_presence = state.total_presence.checked_sub(penalty)
                .ok_or(ErrorCode::SlashingOverflow)?;
            msg!("Late withdrawal penalty applied: -{}", penalty);
        }

        registration.is_registered = false;
        event.registered_count = event.registered_count.checked_sub(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        msg!("Member {:?} withdrew from event {}", member.authority, event.id);
        Ok(())
    }

    /// Record attendance for a member at an event
    /// Called by event organizer after the event
    pub fn record_attendance(
        ctx: Context<RecordAttendance>,
        was_present: bool,
    ) -> Result<()> {
        let state = &mut ctx.accounts.state;
        
        // Kill switch check
        require!(
            state.active_members >= MIN_QUORUM,
            ErrorCode::DaoShutdown
        );

        let event = &mut ctx.accounts.event;
        let registration = &mut ctx.accounts.registration;
        let member = &mut ctx.accounts.member;

        let current_time = Clock::get()?.unix_timestamp;
        require!(current_time >= event.start_time, ErrorCode::EventNotStartedYet);

        let was_registered = registration.is_registered;

        match (was_registered, was_present) {
            // Registered and present: reward
            (true, true) => {
                member.presence_score = member.presence_score.checked_add(ATTENDANCE_REWARD)
                    .ok_or(ErrorCode::ArithmeticOverflow)?;
                state.total_presence = state.total_presence.checked_add(ATTENDANCE_REWARD)
                    .ok_or(ErrorCode::ArithmeticOverflow)?;
                registration.has_attended = true;
                event.attended_count = event.attended_count.checked_add(1)
                    .ok_or(ErrorCode::ArithmeticOverflow)?;
                msg!("Attendance recorded: +{} presence", ATTENDANCE_REWARD);
            }
            // Registered but absent (ghosting): heavy penalty
            (true, false) => {
                let penalty = GHOSTING_PENALTY.min(member.presence_score);
                member.presence_score = member.presence_score.checked_sub(penalty)
                    .ok_or(ErrorCode::SlashingOverflow)?;
                state.total_presence = state.total_presence.checked_sub(penalty)
                    .ok_or(ErrorCode::SlashingOverflow)?;
                msg!("Ghosting penalty applied: -{}", penalty);
            }
            // Not registered but present (oubli): penalty
            (false, true) => {
                let penalty = OUBLI_PENALTY.min(member.presence_score);
                member.presence_score = member.presence_score.checked_sub(penalty)
                    .ok_or(ErrorCode::SlashingOverflow)?;
                state.total_presence = state.total_presence.checked_sub(penalty)
                    .ok_or(ErrorCode::SlashingOverflow)?;
                registration.has_attended = true;
                event.attended_count = event.attended_count.checked_add(1)
                    .ok_or(ErrorCode::ArithmeticOverflow)?;
                msg!("Oubli penalty applied: -{}", penalty);
            }
            // Not registered and not present: nothing happens
            (false, false) => {
                msg!("No action needed: not registered and not present");
            }
        }

        Ok(())
    }

    /// Finalize an event (no more attendance can be recorded)
    pub fn finalize_event(ctx: Context<FinalizeEvent>) -> Result<()> {
        let state = &ctx.accounts.state;
        
        // Kill switch check
        require!(
            state.active_members >= MIN_QUORUM,
            ErrorCode::DaoShutdown
        );

        let event = &mut ctx.accounts.event;
        require!(!event.is_finalized, ErrorCode::EventAlreadyFinalized);
        
        let current_time = Clock::get()?.unix_timestamp;
        require!(current_time >= event.start_time, ErrorCode::EventNotStartedYet);

        event.is_finalized = true;
        msg!("Event {} finalized", event.id);
        Ok(())
    }

    /// Update competence score for a member (peer review)
    pub fn update_competence(
        ctx: Context<UpdateCompetence>,
        score_delta: i64,
    ) -> Result<()> {
        let state = &mut ctx.accounts.state;
        
        // Kill switch check
        require!(
            state.active_members >= MIN_QUORUM,
            ErrorCode::DaoShutdown
        );

        let member = &mut ctx.accounts.target_member;
        
        if score_delta >= 0 {
            let delta = (score_delta as u64).checked_mul(SCALING_FACTOR)
                .ok_or(ErrorCode::ArithmeticOverflow)?;
            member.competence_score = member.competence_score.checked_add(delta)
                .ok_or(ErrorCode::ArithmeticOverflow)?;
            state.total_competence = state.total_competence.checked_add(delta)
                .ok_or(ErrorCode::ArithmeticOverflow)?;
        } else {
            let delta = ((-score_delta) as u64).checked_mul(SCALING_FACTOR)
                .ok_or(ErrorCode::ArithmeticOverflow)?;
            let actual_delta = delta.min(member.competence_score);
            member.competence_score = member.competence_score.checked_sub(actual_delta)
                .ok_or(ErrorCode::SlashingOverflow)?;
            state.total_competence = state.total_competence.checked_sub(actual_delta)
                .ok_or(ErrorCode::SlashingOverflow)?;
        }

        msg!("Competence updated for {:?}: delta={}", member.authority, score_delta);
        Ok(())
    }

    /// Create a new proposal
    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        title: String,
        description: String,
        proposal_type: ProposalType,
        voting_period: i64,
    ) -> Result<()> {
        let state = &mut ctx.accounts.state;
        
        // Kill switch check
        require!(
            state.active_members >= MIN_QUORUM,
            ErrorCode::DaoShutdown
        );

        let member = &ctx.accounts.member;
        require!(member.is_active, ErrorCode::MemberNotActive);

        // Calculate total voting power snapshot at proposal creation
        let total_power_snapshot = calculate_total_voting_power(state);

        let current_time = Clock::get()?.unix_timestamp;
        let proposal = &mut ctx.accounts.proposal;
        
        proposal.id = state.proposal_counter;
        proposal.proposer = member.authority;
        proposal.title = title;
        proposal.description = description;
        proposal.proposal_type = proposal_type;
        proposal.votes_for = 0;
        proposal.votes_against = 0;
        proposal.total_power_snapshot = total_power_snapshot;
        proposal.created_at = current_time;
        proposal.voting_ends_at = current_time.checked_add(voting_period)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        proposal.status = ProposalStatus::Active;
        proposal.bump = ctx.bumps.proposal;

        state.proposal_counter = state.proposal_counter.checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        msg!("Proposal {} created: {}", proposal.id, proposal.title);
        Ok(())
    }

    /// Vote on a proposal
    pub fn vote(ctx: Context<Vote>, support: bool) -> Result<()> {
        let state = &ctx.accounts.state;
        
        // Kill switch check
        require!(
            state.active_members >= MIN_QUORUM,
            ErrorCode::DaoShutdown
        );

        let member = &ctx.accounts.member;
        require!(member.is_active, ErrorCode::MemberNotActive);

        let proposal = &mut ctx.accounts.proposal;
        require!(
            proposal.status == ProposalStatus::Active,
            ErrorCode::ProposalNotActive
        );

        let current_time = Clock::get()?.unix_timestamp;
        require!(
            current_time < proposal.voting_ends_at,
            ErrorCode::VotingPeriodEnded
        );

        let vote_record = &mut ctx.accounts.vote_record;
        require!(!vote_record.has_voted, ErrorCode::AlreadyVoted);

        // Calculate voting weight
        let voting_weight = calculate_voting_weight(member, state);
        require!(voting_weight > 0, ErrorCode::InsufficientReputation);

        if support {
            proposal.votes_for = proposal.votes_for.checked_add(voting_weight)
                .ok_or(ErrorCode::ArithmeticOverflow)?;
        } else {
            proposal.votes_against = proposal.votes_against.checked_add(voting_weight)
                .ok_or(ErrorCode::ArithmeticOverflow)?;
        }

        vote_record.voter = member.authority;
        vote_record.proposal_id = proposal.id;
        vote_record.support = support;
        vote_record.weight = voting_weight;
        vote_record.has_voted = true;
        vote_record.bump = ctx.bumps.vote_record;

        msg!(
            "Vote recorded: {:?} voted {} with weight {}",
            member.authority,
            if support { "FOR" } else { "AGAINST" },
            voting_weight
        );
        Ok(())
    }

    /// Execute/finalize a proposal after voting period
    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        let state = &ctx.accounts.state;
        
        // Kill switch check
        require!(
            state.active_members >= MIN_QUORUM,
            ErrorCode::DaoShutdown
        );

        let proposal = &mut ctx.accounts.proposal;
        require!(
            proposal.status == ProposalStatus::Active,
            ErrorCode::ProposalNotActive
        );

        let current_time = Clock::get()?.unix_timestamp;
        require!(
            current_time >= proposal.voting_ends_at,
            ErrorCode::VotingPeriodNotEnded
        );

        // Determine if proposal passed based on type
        let passed = match proposal.proposal_type {
            // Critical proposals need absolute majority (> 50% of total power)
            ProposalType::Critical => {
                let threshold = proposal.total_power_snapshot / 2;
                proposal.votes_for > threshold
            }
            // Operational proposals need relative majority (for > against)
            ProposalType::Operational => {
                proposal.votes_for > proposal.votes_against
            }
        };

        proposal.status = if passed {
            ProposalStatus::Passed
        } else {
            ProposalStatus::Rejected
        };

        msg!(
            "Proposal {} {}: for={}, against={}, threshold={}",
            proposal.id,
            if passed { "PASSED" } else { "REJECTED" },
            proposal.votes_for,
            proposal.votes_against,
            proposal.total_power_snapshot / 2
        );
        Ok(())
    }

    /// Ban a member (requires passed Critical proposal)
    pub fn ban_member(ctx: Context<BanMember>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        
        // Kill switch check
        require!(
            state.active_members >= MIN_QUORUM,
            ErrorCode::DaoShutdown
        );

        let member = &mut ctx.accounts.target_member;
        require!(member.is_active, ErrorCode::MemberNotActive);

        // Remove member's scores from totals
        state.total_presence = state.total_presence.checked_sub(member.presence_score)
            .ok_or(ErrorCode::SlashingOverflow)?;
        state.total_competence = state.total_competence.checked_sub(member.competence_score)
            .ok_or(ErrorCode::SlashingOverflow)?;
        state.active_members = state.active_members.checked_sub(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        member.is_active = false;
        member.presence_score = 0;
        member.competence_score = 0;

        msg!("Member {:?} has been banned", member.authority);
        
        // Check kill switch after banning
        if state.active_members < MIN_QUORUM {
            msg!("WARNING: DAO is now frozen (< {} active members)", MIN_QUORUM);
        }
        
        Ok(())
    }

    /// Coopt a new member (requires passed Critical proposal)
    pub fn coopt_member(ctx: Context<CooptMember>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        
        // Kill switch check
        require!(
            state.active_members >= MIN_QUORUM,
            ErrorCode::DaoShutdown
        );

        let member = &mut ctx.accounts.new_member;
        
        // New coopted members start with minimal scores
        let initial_presence = SCALING_FACTOR; // 1 * SCALING_FACTOR
        let initial_competence = SCALING_FACTOR; // 1 * SCALING_FACTOR

        member.authority = ctx.accounts.new_member_authority.key();
        member.presence_score = initial_presence;
        member.competence_score = initial_competence;
        member.is_active = true;
        member.is_genesis = false;
        member.joined_at = Clock::get()?.unix_timestamp;
        member.bump = ctx.bumps.new_member;

        // Update global state
        state.total_presence = state.total_presence.checked_add(initial_presence)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        state.total_competence = state.total_competence.checked_add(initial_competence)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        state.active_members = state.active_members.checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        msg!("New member coopted: {:?}", member.authority);
        Ok(())
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/// Calculate voting weight for a member
/// Formula: S_member = (Pres_member/Pres_total) × (Comp_member/Comp_total)
/// Returns scaled u128 to prevent overflow
fn calculate_voting_weight(member: &Member, state: &State) -> u128 {
    if state.total_presence == 0 || state.total_competence == 0 {
        return 0;
    }
    
    let p_m = member.presence_score as u128;
    let c_m = member.competence_score as u128;
    let p_tot = state.total_presence as u128;
    let c_tot = state.total_competence as u128;
    let scale = SCALING_FACTOR as u128;

    // (p_m * c_m * SCALING_FACTOR) / (p_tot * c_tot)
    let numerator = p_m.saturating_mul(c_m).saturating_mul(scale);
    let denominator = p_tot.saturating_mul(c_tot);
    
    if denominator == 0 {
        0
    } else {
        numerator / denominator
    }
}

/// Calculate total voting power (sum of all members' weights = SCALING_FACTOR)
fn calculate_total_voting_power(state: &State) -> u128 {
    // By the formula, sum of all weights equals SCALING_FACTOR
    // when everyone has non-zero scores
    if state.total_presence == 0 || state.total_competence == 0 {
        0
    } else {
        SCALING_FACTOR as u128
    }
}

// ============================================================================
// ACCOUNT STRUCTURES (PDAs)
// ============================================================================

/// Global DAO state (singleton)
#[account]
#[derive(InitSpace)]
pub struct State {
    /// Authority who initialized the DAO
    pub authority: Pubkey,
    /// Sum of all active members' presence scores
    pub total_presence: u64,
    /// Sum of all active members' competence scores
    pub total_competence: u64,
    /// Number of currently active members
    pub active_members: u8,
    /// Number of genesis members added (max 3)
    pub genesis_count: u8,
    /// Counter for event IDs
    pub event_counter: u64,
    /// Counter for proposal IDs
    pub proposal_counter: u64,
    /// PDA bump
    pub bump: u8,
}

/// Member account
#[account]
#[derive(InitSpace)]
pub struct Member {
    /// Member's wallet address
    pub authority: Pubkey,
    /// Presence score (scaled by SCALING_FACTOR)
    pub presence_score: u64,
    /// Competence score (scaled by SCALING_FACTOR)
    pub competence_score: u64,
    /// Whether member is currently active
    pub is_active: bool,
    /// Whether member is a genesis member
    pub is_genesis: bool,
    /// Timestamp when member joined
    pub joined_at: i64,
    /// PDA bump
    pub bump: u8,
}

/// Event/Track session
#[account]
#[derive(InitSpace)]
pub struct TrackSession {
    /// Event ID
    pub id: u64,
    /// Creator of the event
    pub creator: Pubkey,
    /// Start time (unix timestamp)
    pub start_time: i64,
    /// Event description
    #[max_len(256)]
    pub description: String,
    /// Whether attendance recording is finalized
    pub is_finalized: bool,
    /// Number of registered members
    pub registered_count: u32,
    /// Number of members who attended
    pub attended_count: u32,
    /// PDA bump
    pub bump: u8,
}

/// Event registration record
#[account]
#[derive(InitSpace)]
pub struct EventRegistration {
    /// Member's wallet address
    pub member: Pubkey,
    /// Event ID
    pub event_id: u64,
    /// Whether currently registered
    pub is_registered: bool,
    /// Whether attended the event
    pub has_attended: bool,
    /// Registration timestamp
    pub registered_at: i64,
    /// PDA bump
    pub bump: u8,
}

/// Governance proposal
#[account]
#[derive(InitSpace)]
pub struct Proposal {
    /// Proposal ID
    pub id: u64,
    /// Proposer's wallet address
    pub proposer: Pubkey,
    /// Proposal title
    #[max_len(128)]
    pub title: String,
    /// Proposal description
    #[max_len(512)]
    pub description: String,
    /// Type of proposal (Critical or Operational)
    pub proposal_type: ProposalType,
    /// Total votes in favor (u128 for voting power)
    pub votes_for: u128,
    /// Total votes against (u128 for voting power)
    pub votes_against: u128,
    /// Snapshot of total voting power at creation
    pub total_power_snapshot: u128,
    /// Creation timestamp
    pub created_at: i64,
    /// Voting end timestamp
    pub voting_ends_at: i64,
    /// Current status
    pub status: ProposalStatus,
    /// PDA bump
    pub bump: u8,
}

/// Vote record for a member on a proposal
#[account]
#[derive(InitSpace)]
pub struct VoteRecord {
    /// Voter's wallet address
    pub voter: Pubkey,
    /// Proposal ID
    pub proposal_id: u64,
    /// Whether voted in support
    pub support: bool,
    /// Voting weight used
    pub weight: u128,
    /// Whether has voted
    pub has_voted: bool,
    /// PDA bump
    pub bump: u8,
}

// ============================================================================
// ENUMS
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum ProposalType {
    /// Critical proposals (cooptation, ban) - need absolute majority
    Critical,
    /// Operational proposals (subjects, dates) - need relative majority
    Operational,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum ProposalStatus {
    /// Voting is ongoing
    Active,
    /// Proposal passed
    Passed,
    /// Proposal rejected
    Rejected,
    /// Proposal cancelled
    Cancelled,
}

// ============================================================================
// ACCOUNT CONTEXTS
// ============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + State::INIT_SPACE,
        seeds = [b"state"],
        bump
    )]
    pub state: Account<'info, State>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddGenesisMember<'info> {
    #[account(
        mut,
        seeds = [b"state"],
        bump = state.bump
    )]
    pub state: Account<'info, State>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + Member::INIT_SPACE,
        seeds = [b"member", member_authority.key().as_ref()],
        bump
    )]
    pub member: Account<'info, Member>,
    
    /// The wallet address of the new member
    /// CHECK: This is the authority for the new member account
    pub member_authority: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateEvent<'info> {
    #[account(
        mut,
        seeds = [b"state"],
        bump = state.bump
    )]
    pub state: Account<'info, State>,
    
    #[account(
        init,
        payer = creator,
        space = 8 + TrackSession::INIT_SPACE,
        seeds = [b"track", state.event_counter.to_le_bytes().as_ref()],
        bump
    )]
    pub event: Account<'info, TrackSession>,
    
    #[account(
        seeds = [b"member", creator.key().as_ref()],
        bump = member.bump,
        constraint = member.is_active @ ErrorCode::MemberNotActive
    )]
    pub member: Account<'info, Member>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterForEvent<'info> {
    #[account(
        mut,
        seeds = [b"state"],
        bump = state.bump
    )]
    pub state: Account<'info, State>,
    
    #[account(
        mut,
        seeds = [b"track", event.id.to_le_bytes().as_ref()],
        bump = event.bump
    )]
    pub event: Account<'info, TrackSession>,
    
    #[account(
        mut,
        seeds = [b"member", authority.key().as_ref()],
        bump = member.bump,
        constraint = member.is_active @ ErrorCode::MemberNotActive
    )]
    pub member: Account<'info, Member>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + EventRegistration::INIT_SPACE,
        seeds = [b"registration", event.id.to_le_bytes().as_ref(), authority.key().as_ref()],
        bump
    )]
    pub registration: Account<'info, EventRegistration>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawFromEvent<'info> {
    #[account(
        mut,
        seeds = [b"state"],
        bump = state.bump
    )]
    pub state: Account<'info, State>,
    
    #[account(
        mut,
        seeds = [b"track", event.id.to_le_bytes().as_ref()],
        bump = event.bump
    )]
    pub event: Account<'info, TrackSession>,
    
    #[account(
        mut,
        seeds = [b"member", authority.key().as_ref()],
        bump = member.bump,
        constraint = member.is_active @ ErrorCode::MemberNotActive
    )]
    pub member: Account<'info, Member>,
    
    #[account(
        mut,
        seeds = [b"registration", event.id.to_le_bytes().as_ref(), authority.key().as_ref()],
        bump = registration.bump,
        constraint = registration.member == authority.key() @ ErrorCode::Unauthorized
    )]
    pub registration: Account<'info, EventRegistration>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct RecordAttendance<'info> {
    #[account(
        mut,
        seeds = [b"state"],
        bump = state.bump
    )]
    pub state: Account<'info, State>,
    
    #[account(
        mut,
        seeds = [b"track", event.id.to_le_bytes().as_ref()],
        bump = event.bump,
        constraint = event.creator == organizer.key() @ ErrorCode::Unauthorized
    )]
    pub event: Account<'info, TrackSession>,
    
    #[account(
        mut,
        seeds = [b"member", member_authority.key().as_ref()],
        bump = member.bump
    )]
    pub member: Account<'info, Member>,
    
    /// CHECK: This is the authority of the member being recorded
    pub member_authority: UncheckedAccount<'info>,
    
    #[account(
        mut,
        seeds = [b"registration", event.id.to_le_bytes().as_ref(), member_authority.key().as_ref()],
        bump = registration.bump
    )]
    pub registration: Account<'info, EventRegistration>,
    
    #[account(
        seeds = [b"member", organizer.key().as_ref()],
        bump = organizer_member.bump,
        constraint = organizer_member.is_active @ ErrorCode::MemberNotActive
    )]
    pub organizer_member: Account<'info, Member>,
    
    #[account(mut)]
    pub organizer: Signer<'info>,
}

#[derive(Accounts)]
pub struct FinalizeEvent<'info> {
    #[account(
        seeds = [b"state"],
        bump = state.bump
    )]
    pub state: Account<'info, State>,
    
    #[account(
        mut,
        seeds = [b"track", event.id.to_le_bytes().as_ref()],
        bump = event.bump,
        constraint = event.creator == organizer.key() @ ErrorCode::Unauthorized
    )]
    pub event: Account<'info, TrackSession>,
    
    #[account(
        seeds = [b"member", organizer.key().as_ref()],
        bump = organizer_member.bump,
        constraint = organizer_member.is_active @ ErrorCode::MemberNotActive
    )]
    pub organizer_member: Account<'info, Member>,
    
    pub organizer: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateCompetence<'info> {
    #[account(
        mut,
        seeds = [b"state"],
        bump = state.bump
    )]
    pub state: Account<'info, State>,
    
    #[account(
        mut,
        seeds = [b"member", target_authority.key().as_ref()],
        bump = target_member.bump
    )]
    pub target_member: Account<'info, Member>,
    
    /// CHECK: This is the authority of the target member
    pub target_authority: UncheckedAccount<'info>,
    
    #[account(
        seeds = [b"member", reviewer.key().as_ref()],
        bump = reviewer_member.bump,
        constraint = reviewer_member.is_active @ ErrorCode::MemberNotActive
    )]
    pub reviewer_member: Account<'info, Member>,
    
    pub reviewer: Signer<'info>,
}

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(
        mut,
        seeds = [b"state"],
        bump = state.bump
    )]
    pub state: Account<'info, State>,
    
    #[account(
        init,
        payer = proposer,
        space = 8 + Proposal::INIT_SPACE,
        seeds = [b"proposal", state.proposal_counter.to_le_bytes().as_ref()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,
    
    #[account(
        seeds = [b"member", proposer.key().as_ref()],
        bump = member.bump,
        constraint = member.is_active @ ErrorCode::MemberNotActive
    )]
    pub member: Account<'info, Member>,
    
    #[account(mut)]
    pub proposer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(
        seeds = [b"state"],
        bump = state.bump
    )]
    pub state: Account<'info, State>,
    
    #[account(
        mut,
        seeds = [b"proposal", proposal.id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    
    #[account(
        seeds = [b"member", voter.key().as_ref()],
        bump = member.bump,
        constraint = member.is_active @ ErrorCode::MemberNotActive
    )]
    pub member: Account<'info, Member>,
    
    #[account(
        init,
        payer = voter,
        space = 8 + VoteRecord::INIT_SPACE,
        seeds = [b"vote", proposal.id.to_le_bytes().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,
    
    #[account(mut)]
    pub voter: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    #[account(
        seeds = [b"state"],
        bump = state.bump
    )]
    pub state: Account<'info, State>,
    
    #[account(
        mut,
        seeds = [b"proposal", proposal.id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    
    pub executor: Signer<'info>,
}

#[derive(Accounts)]
pub struct BanMember<'info> {
    #[account(
        mut,
        seeds = [b"state"],
        bump = state.bump
    )]
    pub state: Account<'info, State>,
    
    #[account(
        mut,
        seeds = [b"member", target_authority.key().as_ref()],
        bump = target_member.bump
    )]
    pub target_member: Account<'info, Member>,
    
    /// CHECK: This is the authority of the member to ban
    pub target_authority: UncheckedAccount<'info>,
    
    #[account(
        seeds = [b"member", executor.key().as_ref()],
        bump = executor_member.bump,
        constraint = executor_member.is_active @ ErrorCode::MemberNotActive
    )]
    pub executor_member: Account<'info, Member>,
    
    pub executor: Signer<'info>,
}

#[derive(Accounts)]
pub struct CooptMember<'info> {
    #[account(
        mut,
        seeds = [b"state"],
        bump = state.bump
    )]
    pub state: Account<'info, State>,
    
    #[account(
        init,
        payer = sponsor,
        space = 8 + Member::INIT_SPACE,
        seeds = [b"member", new_member_authority.key().as_ref()],
        bump
    )]
    pub new_member: Account<'info, Member>,
    
    /// CHECK: This is the authority for the new member
    pub new_member_authority: UncheckedAccount<'info>,
    
    #[account(
        seeds = [b"member", sponsor.key().as_ref()],
        bump = sponsor_member.bump,
        constraint = sponsor_member.is_active @ ErrorCode::MemberNotActive
    )]
    pub sponsor_member: Account<'info, Member>,
    
    #[account(mut)]
    pub sponsor: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

// ============================================================================
// ERROR CODES
// ============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("DAO is frozen: less than 3 active members")]
    DaoShutdown,
    
    #[msg("Event has already started")]
    EventAlreadyStarted,
    
    #[msg("Genesis member limit reached (max 3)")]
    GenesisClosed,
    
    #[msg("Insufficient reputation to perform this action")]
    InsufficientReputation,
    
    #[msg("Cannot slash: would result in negative balance")]
    SlashingOverflow,
    
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    
    #[msg("Member is not active")]
    MemberNotActive,
    
    #[msg("Not registered for this event")]
    NotRegistered,
    
    #[msg("Event has already been finalized")]
    EventAlreadyFinalized,
    
    #[msg("Event has not started yet")]
    EventNotStartedYet,
    
    #[msg("Invalid event time")]
    InvalidEventTime,
    
    #[msg("Unauthorized action")]
    Unauthorized,
    
    #[msg("Proposal is not active")]
    ProposalNotActive,
    
    #[msg("Voting period has ended")]
    VotingPeriodEnded,
    
    #[msg("Voting period has not ended yet")]
    VotingPeriodNotEnded,
    
    #[msg("Already voted on this proposal")]
    AlreadyVoted,
}
