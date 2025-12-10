use std::str::FromStr;

use anchor_client::{
    solana_sdk::{
        commitment_config::CommitmentConfig,
        pubkey::Pubkey,
        signature::{read_keypair_file, Keypair},
        signer::Signer,
        system_program,
    },
    Client, Cluster,
};

use dao::{GENESIS_COMPETENCE, GENESIS_PRESENCE, SCALING_FACTOR};

fn get_state_pda(program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"state"], program_id)
}

fn get_member_pda(program_id: &Pubkey, authority: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"member", authority.as_ref()], program_id)
}

#[test]
fn test_add_genesis_members() {
    let program_id_str = "Ft54i1cMxhkD5pvxMHfmzW8quwPZRPVQRTcqMFLXqYzi";
    let anchor_wallet = std::env::var("ANCHOR_WALLET").unwrap();
    let payer = read_keypair_file(&anchor_wallet).unwrap();

    let client = Client::new_with_options(Cluster::Localnet, &payer, CommitmentConfig::confirmed());
    let program_id = Pubkey::from_str(program_id_str).unwrap();
    let program = client.program(program_id).unwrap();

    let (state_pda, _) = get_state_pda(&program_id);

    // Initialize DAO first
    let _ = program
        .request()
        .accounts(dao::accounts::Initialize {
            state: state_pda,
            authority: payer.pubkey(),
            system_program: system_program::ID,
        })
        .args(dao::instruction::Initialize {})
        .send();

    // Create 3 genesis members
    let genesis_member_1 = Keypair::new();
    let genesis_member_2 = Keypair::new();
    let genesis_member_3 = Keypair::new();

    let genesis_members = vec![&genesis_member_1, &genesis_member_2, &genesis_member_3];

    for (i, member_keypair) in genesis_members.iter().enumerate() {
        let (member_pda, _) = get_member_pda(&program_id, &member_keypair.pubkey());

        let tx = program
            .request()
            .accounts(dao::accounts::AddGenesisMember {
                state: state_pda,
                member: member_pda,
                member_authority: member_keypair.pubkey(),
                authority: payer.pubkey(),
                system_program: system_program::ID,
            })
            .args(dao::instruction::AddGenesisMember {})
            .send()
            .expect(&format!("Failed to add genesis member {}", i + 1));

        println!("Genesis member {} added! Transaction: {}", i + 1, tx);

        // Verify member account
        let member_account: dao::Member = program
            .account(member_pda)
            .expect("Failed to fetch member");

        assert_eq!(member_account.authority, member_keypair.pubkey());
        assert_eq!(member_account.presence_score, GENESIS_PRESENCE);
        assert_eq!(member_account.competence_score, GENESIS_COMPETENCE);
        assert!(member_account.is_active);
        assert!(member_account.is_genesis);
    }

    // Verify state after adding all genesis members
    let state: dao::State = program.account(state_pda).expect("Failed to fetch state");
    
    assert_eq!(state.active_members, 3);
    assert_eq!(state.genesis_count, 3);
    assert_eq!(state.total_presence, GENESIS_PRESENCE * 3);
    assert_eq!(state.total_competence, GENESIS_COMPETENCE * 3);

    println!("All genesis members added and verified!");

    // Attempting to add a 4th genesis member should fail
    let extra_member = Keypair::new();
    let (extra_member_pda, _) = get_member_pda(&program_id, &extra_member.pubkey());

    let result = program
        .request()
        .accounts(dao::accounts::AddGenesisMember {
            state: state_pda,
            member: extra_member_pda,
            member_authority: extra_member.pubkey(),
            authority: payer.pubkey(),
            system_program: system_program::ID,
        })
        .args(dao::instruction::AddGenesisMember {})
        .send();

    assert!(result.is_err(), "Should not be able to add 4th genesis member");
    println!("Correctly rejected 4th genesis member!");
}

#[test]
fn test_genesis_member_voting_power() {
    // Formula: S_member = (Pres_member/Pres_total) × (Comp_member/Comp_total)
    // 
    // With 3 equal genesis members:
    // - P_member = 3 * SCALING, P_total = 9 * SCALING
    // - C_member = 10 * SCALING, C_total = 30 * SCALING
    // - S_member = (3/9) × (10/30) = (1/3) × (1/3) = 1/9
    // 
    // Weight = (P_m * C_m * SCALING) / (P_tot * C_tot)
    // = (3 * 10 * SCALING^3) / (9 * 30 * SCALING^2)
    // = (30 * SCALING) / 270
    // = SCALING / 9
    
    let p_member = GENESIS_PRESENCE;
    let c_member = GENESIS_COMPETENCE;
    let p_total = GENESIS_PRESENCE * 3;
    let c_total = GENESIS_COMPETENCE * 3;
    
    let numerator = (p_member as u128) * (c_member as u128) * (SCALING_FACTOR as u128);
    let denominator = (p_total as u128) * (c_total as u128);
    let weight = numerator / denominator;
    
    // Each member should have 1/9 of SCALING_FACTOR
    let expected_weight = (SCALING_FACTOR as u128) / 9;
    
    // Allow for rounding
    assert!((weight as i128 - expected_weight as i128).abs() < 1000);
    
    // 3 equal members should have equal weights
    let total_weight = weight * 3;
    let expected_total = (SCALING_FACTOR as u128) / 3; // 3 * 1/9 = 1/3
    
    println!("Individual weight: {} (expected ~{})", weight, expected_weight);
    println!("Total weight (3 members): {} (expected ~{})", total_weight, expected_total);
    
    assert!((total_weight as i128 - expected_total as i128).abs() < 1000);
}
