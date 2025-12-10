use std::str::FromStr;

use anchor_client::{
    solana_sdk::{
        commitment_config::CommitmentConfig,
        pubkey::Pubkey,
        signature::read_keypair_file,
        signer::Signer,
        system_program,
    },
    Client, Cluster,
};

fn get_state_pda(program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"state"], program_id)
}

#[test]
fn test_initialize() {
    let program_id = "Ft54i1cMxhkD5pvxMHfmzW8quwPZRPVQRTcqMFLXqYzi";
    let anchor_wallet = std::env::var("ANCHOR_WALLET").unwrap();
    let payer = read_keypair_file(&anchor_wallet).unwrap();

    let client = Client::new_with_options(Cluster::Localnet, &payer, CommitmentConfig::confirmed());
    let program_id = Pubkey::from_str(program_id).unwrap();
    let program = client.program(program_id).unwrap();

    let (state_pda, _bump) = get_state_pda(&program_id);

    let tx = program
        .request()
        .accounts(dao::accounts::Initialize {
            state: state_pda,
            authority: payer.pubkey(),
            system_program: system_program::ID,
        })
        .args(dao::instruction::Initialize {})
        .send()
        .expect("Failed to initialize DAO");

    println!("DAO initialized! Transaction: {}", tx);

    // Verify state was created
    let state_account: dao::State = program.account(state_pda).expect("Failed to fetch state");
    
    assert_eq!(state_account.authority, payer.pubkey());
    assert_eq!(state_account.total_presence, 0);
    assert_eq!(state_account.total_competence, 0);
    assert_eq!(state_account.active_members, 0);
    assert_eq!(state_account.genesis_count, 0);
    assert_eq!(state_account.event_counter, 0);
    assert_eq!(state_account.proposal_counter, 0);
    
    println!("State verified successfully!");
}
