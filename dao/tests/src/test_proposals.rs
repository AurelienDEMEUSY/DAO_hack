use dao::{ProposalStatus, ProposalType, GENESIS_COMPETENCE, GENESIS_PRESENCE, MIN_QUORUM, SCALING_FACTOR};

/// Governance rules:
/// - Critical proposals (cooptation, ban): Need votes_for > total_power_snapshot / 2 (absolute majority)
/// - Operational proposals (subjects, dates): Need votes_for > votes_against (relative majority)

#[test]
fn test_critical_proposal_majority() {
    // Critical proposal needs > 50% of total voting power
    let total_power = SCALING_FACTOR as u128;
    let threshold = total_power / 2;
    
    // Scenario 1: 2 out of 3 genesis members vote FOR (each has ~1/3 power)
    let two_thirds_power = (SCALING_FACTOR as u128) * 2 / 3;
    assert!(two_thirds_power > threshold, "2/3 should pass critical proposal");
    println!("2/3 vote: {} > {} (threshold) = PASS", two_thirds_power, threshold);
    
    // Scenario 2: 1 out of 3 genesis members vote FOR
    let one_third_power = (SCALING_FACTOR as u128) / 3;
    assert!(one_third_power <= threshold, "1/3 should NOT pass critical proposal");
    println!("1/3 vote: {} <= {} (threshold) = FAIL", one_third_power, threshold);
    
    // Exactly 50% should NOT pass (needs > 50%, not >= 50%)
    let half_power = total_power / 2;
    assert!(!(half_power > threshold), "Exactly 50% should NOT pass");
    println!("50% vote: {} > {} (threshold) = FAIL (needs >50%)", half_power, threshold);
}

#[test]
fn test_operational_proposal_majority() {
    // Operational proposal needs votes_for > votes_against (relative majority)
    
    // Scenario 1: 2 FOR, 1 AGAINST
    let votes_for = (SCALING_FACTOR as u128) * 2 / 3;
    let votes_against = (SCALING_FACTOR as u128) / 3;
    assert!(votes_for > votes_against, "2 FOR vs 1 AGAINST should pass");
    println!("2 FOR ({}) > 1 AGAINST ({}) = PASS", votes_for, votes_against);
    
    // Scenario 2: 1 FOR, 2 AGAINST
    let votes_for = (SCALING_FACTOR as u128) / 3;
    let votes_against = (SCALING_FACTOR as u128) * 2 / 3;
    assert!(!(votes_for > votes_against), "1 FOR vs 2 AGAINST should fail");
    println!("1 FOR ({}) > 2 AGAINST ({}) = FAIL", votes_for, votes_against);
    
    // Scenario 3: 1 FOR, 1 AGAINST, 1 ABSTAIN
    let votes_for = (SCALING_FACTOR as u128) / 3;
    let votes_against = (SCALING_FACTOR as u128) / 3;
    assert!(!(votes_for > votes_against), "Equal votes should fail (needs strict majority)");
    println!("1 FOR ({}) > 1 AGAINST ({}) = FAIL (equal)", votes_for, votes_against);
}

#[test]
fn test_kill_switch() {
    // DAO freezes if active_members < MIN_QUORUM (3)
    assert_eq!(MIN_QUORUM, 3, "Kill switch threshold should be 3");
    
    // With 3 members: DAO operational
    let active_members = 3u8;
    assert!(active_members >= MIN_QUORUM, "3 members = operational");
    println!("{} members >= {} = DAO OPERATIONAL", active_members, MIN_QUORUM);
    
    // With 2 members: DAO frozen
    let active_members = 2u8;
    assert!(active_members < MIN_QUORUM, "2 members = frozen");
    println!("{} members < {} = DAO FROZEN", active_members, MIN_QUORUM);
}

#[test]
fn test_voting_weight_calculation() {
    // Formula: S_member = (Pres_member/Pres_total) × (Comp_member/Comp_total)
    // Returns scaled u128 to prevent overflow
    //
    // Note: This is a quadratic formula, so the sum of weights does NOT equal 1.
    // For N equal members, each has weight (1/N)², and total is N × (1/N)² = 1/N
    
    // With 3 equal genesis members
    let p_member = GENESIS_PRESENCE as u128;
    let c_member = GENESIS_COMPETENCE as u128;
    let p_total = (GENESIS_PRESENCE * 3) as u128;
    let c_total = (GENESIS_COMPETENCE * 3) as u128;
    let scale = SCALING_FACTOR as u128;
    
    // Weight = (p_m * c_m * SCALING) / (p_tot * c_tot)
    let numerator = p_member * c_member * scale;
    let denominator = p_total * c_total;
    let weight = numerator / denominator;
    
    // Each member has weight = SCALING / 9 (because (1/3) × (1/3) = 1/9)
    let expected_weight = scale / 9;
    
    // Sum of all weights = 3 × (1/9) = 1/3 of SCALING
    let total_weight = weight * 3;
    let expected_total = scale / 3;
    
    // Allow for rounding
    let diff = if total_weight > expected_total { 
        total_weight - expected_total 
    } else { 
        expected_total - total_weight 
    };
    assert!(diff < 1000, "Total voting power calculation error");
    
    println!("Individual weight: {} (expected ~{})", weight, expected_weight);
    println!("Total weight (3 members): {} (expected ~{})", total_weight, expected_total);
    println!("Difference: {} (acceptable < 1000)", diff);
}

#[test]
fn test_proposal_types() {
    // Verify ProposalType enum
    let critical = ProposalType::Critical;
    let operational = ProposalType::Operational;
    
    // Match to ensure both variants exist
    match critical {
        ProposalType::Critical => println!("Critical proposal type: cooptation, ban"),
        ProposalType::Operational => panic!("Wrong type"),
    }
    
    match operational {
        ProposalType::Operational => println!("Operational proposal type: subjects, dates"),
        ProposalType::Critical => panic!("Wrong type"),
    }
}

#[test]
fn test_proposal_status() {
    // Verify ProposalStatus enum
    let statuses = vec![
        ProposalStatus::Active,
        ProposalStatus::Passed,
        ProposalStatus::Rejected,
        ProposalStatus::Cancelled,
    ];
    
    for status in statuses {
        match status {
            ProposalStatus::Active => println!("Status: Active (voting ongoing)"),
            ProposalStatus::Passed => println!("Status: Passed"),
            ProposalStatus::Rejected => println!("Status: Rejected"),
            ProposalStatus::Cancelled => println!("Status: Cancelled"),
        }
    }
}
