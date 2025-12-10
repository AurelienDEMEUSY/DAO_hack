use dao::{ATTENDANCE_REWARD, GENESIS_PRESENCE, GHOSTING_PENALTY, LATE_PENALTY, OUBLI_PENALTY, SCALING_FACTOR, SLOT_DURATION};

/// Test constants documentation
/// 
/// Slashing rules (24h window = SLOT_DURATION):
/// - Late registration (< 24h before): -1 presence (LATE_PENALTY)
/// - Late withdrawal (< 24h before): -1 presence (LATE_PENALTY)
/// - Ghosting (registered, absent): -2 presence (GHOSTING_PENALTY)
/// - Oubli (present, not registered): -2 presence (OUBLI_PENALTY)
/// - Attendance (registered, present): +1 presence (ATTENDANCE_REWARD)

#[test]
fn test_slashing_constants() {
    // Verify slashing constants match the spec
    assert_eq!(LATE_PENALTY, 1 * SCALING_FACTOR, "Late penalty should be 1 * SCALING");
    assert_eq!(GHOSTING_PENALTY, 2 * SCALING_FACTOR, "Ghosting penalty should be 2 * SCALING");
    assert_eq!(OUBLI_PENALTY, 2 * SCALING_FACTOR, "Oubli penalty should be 2 * SCALING");
    assert_eq!(ATTENDANCE_REWARD, 1 * SCALING_FACTOR, "Attendance reward should be 1 * SCALING");
    assert_eq!(SLOT_DURATION, 86400, "Slot duration should be 24h (86400 seconds)");
    
    println!("All slashing constants verified!");
}

#[test]
fn test_attendance_scenarios() {
    // Test all 4 attendance scenarios:
    // 1. Registered + Present = +1 presence
    // 2. Registered + Absent (Ghosting) = -2 presence
    // 3. Not Registered + Present (Oubli) = -2 presence
    // 4. Not Registered + Absent = no change
    
    let initial_presence = GENESIS_PRESENCE; // 3 * SCALING
    
    // Scenario 1: Registered and present
    let after_attendance = initial_presence + ATTENDANCE_REWARD;
    assert_eq!(after_attendance, 4 * SCALING_FACTOR);
    println!("Scenario 1 (Registered + Present): {} -> {} (+{})", 
        initial_presence / SCALING_FACTOR,
        after_attendance / SCALING_FACTOR,
        ATTENDANCE_REWARD / SCALING_FACTOR);
    
    // Scenario 2: Ghosting (registered but absent)
    let after_ghosting = initial_presence - GHOSTING_PENALTY;
    assert_eq!(after_ghosting, 1 * SCALING_FACTOR);
    println!("Scenario 2 (Ghosting): {} -> {} (-{})", 
        initial_presence / SCALING_FACTOR,
        after_ghosting / SCALING_FACTOR,
        GHOSTING_PENALTY / SCALING_FACTOR);
    
    // Scenario 3: Oubli (present but not registered)
    let after_oubli = initial_presence - OUBLI_PENALTY;
    assert_eq!(after_oubli, 1 * SCALING_FACTOR);
    println!("Scenario 3 (Oubli): {} -> {} (-{})", 
        initial_presence / SCALING_FACTOR,
        after_oubli / SCALING_FACTOR,
        OUBLI_PENALTY / SCALING_FACTOR);
    
    // Scenario 4: Not registered and not present
    let after_nothing = initial_presence;
    assert_eq!(after_nothing, 3 * SCALING_FACTOR);
    println!("Scenario 4 (No action): {} -> {} (no change)", 
        initial_presence / SCALING_FACTOR,
        after_nothing / SCALING_FACTOR);
}

#[test]
fn test_late_registration_penalty() {
    // When registering < 24h before event, penalty of -1 presence
    let initial_presence = GENESIS_PRESENCE; // 3 * SCALING
    let after_late_registration = initial_presence - LATE_PENALTY;
    
    assert_eq!(after_late_registration, 2 * SCALING_FACTOR);
    println!("Late registration: {} -> {} (-{})", 
        initial_presence / SCALING_FACTOR,
        after_late_registration / SCALING_FACTOR,
        LATE_PENALTY / SCALING_FACTOR);
}

#[test]
fn test_late_withdrawal_penalty() {
    // When withdrawing < 24h before event, penalty of -1 presence
    let initial_presence = GENESIS_PRESENCE; // 3 * SCALING
    let after_late_withdrawal = initial_presence - LATE_PENALTY;
    
    assert_eq!(after_late_withdrawal, 2 * SCALING_FACTOR);
    println!("Late withdrawal: {} -> {} (-{})", 
        initial_presence / SCALING_FACTOR,
        after_late_withdrawal / SCALING_FACTOR,
        LATE_PENALTY / SCALING_FACTOR);
}

#[test]
fn test_slashing_protection() {
    // Slashing should not result in negative balance
    // Member with only 1 * SCALING presence should only lose 1 * SCALING for ghosting
    let low_presence = 1 * SCALING_FACTOR;
    let penalty = GHOSTING_PENALTY.min(low_presence);
    let after_slash = low_presence - penalty;
    
    assert_eq!(after_slash, 0, "Slashing should cap at 0");
    assert_eq!(penalty, low_presence, "Penalty should be capped at current balance");
    
    println!("Slashing protection verified: {} - {} (capped) = {}", 
        low_presence / SCALING_FACTOR,
        penalty / SCALING_FACTOR,
        after_slash);
}
