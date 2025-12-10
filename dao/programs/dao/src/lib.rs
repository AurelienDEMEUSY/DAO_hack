use anchor_lang::prelude::*;

declare_id!("Ft54i1cMxhkD5pvxMHfmzW8quwPZRPVQRTcqMFLXqYzi");

#[program]
pub mod dao {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
