import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

export const PROGRAM_ID = new PublicKey("3hyf5yHncXN2rXjwezK2JxF9s9ohEGjn1GsPByKmyiUj");

export const SCALING_FACTOR = new BN(1_000_000_000);
export const SLOT_DURATION = 86400; // 24 hours in seconds

export enum ProposalType {
  Critical = "Critical",
  Operational = "Operational",
}

export enum ProposalStatus {
  Active = "Active",
  Passed = "Passed",
  Rejected = "Rejected",
  Cancelled = "Cancelled",
}

export interface State {
  authority: PublicKey;
  totalPresence: BN;
  totalCompetence: BN;
  activeMembers: number;
  genesisCount: number;
  eventCounter: BN;
  proposalCounter: BN;
  bump: number;
}

export interface Member {
  authority: PublicKey;
  presenceScore: BN;
  competenceScore: BN;
  isActive: boolean;
  isGenesis: boolean;
  joinedAt: BN;
  bump: number;
}

export interface TrackSession {
  id: BN;
  creator: PublicKey;
  startTime: BN;
  description: string;
  isFinalized: boolean;
  registeredCount: number;
  attendedCount: number;
  bump: number;
}

export interface EventRegistration {
  member: PublicKey;
  eventId: BN;
  isRegistered: boolean;
  hasAttended: boolean;
  registeredAt: BN;
  bump: number;
}

export interface Proposal {
  id: BN;
  proposer: PublicKey;
  title: string;
  description: string;
  proposalType: ProposalType;
  votesFor: BN;
  votesAgainst: BN;
  totalPowerSnapshot: BN;
  createdAt: BN;
  votingEndsAt: BN;
  status: ProposalStatus;
  bump: number;
}

export interface VoteRecord {
  voter: PublicKey;
  proposalId: BN;
  support: boolean;
  weight: BN;
  hasVoted: boolean;
  bump: number;
}

// Helper functions
export function getStatePDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("state")], PROGRAM_ID);
}

export function getMemberPDA(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("member"), authority.toBuffer()],
    PROGRAM_ID
  );
}

export function getEventPDA(eventId: BN): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("track"), eventId.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  );
}

export function getRegistrationPDA(
  eventId: BN,
  memberAuthority: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("registration"),
      eventId.toArrayLike(Buffer, "le", 8),
      memberAuthority.toBuffer(),
    ],
    PROGRAM_ID
  );
}

export function getProposalPDA(proposalId: BN): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("proposal"), proposalId.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  );
}

export function getVoteRecordPDA(
  proposalId: BN,
  voterAuthority: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("vote"),
      proposalId.toArrayLike(Buffer, "le", 8),
      voterAuthority.toBuffer(),
    ],
    PROGRAM_ID
  );
}

// Formatting helpers
export function formatScore(score: BN): string {
  return (score.toNumber() / SCALING_FACTOR.toNumber()).toFixed(2);
}

export function formatVotingPower(weight: BN): string {
  return (weight.toNumber() / SCALING_FACTOR.toNumber() * 100).toFixed(2) + "%";
}

export function formatTimestamp(timestamp: BN | number): string {
  const ts = typeof timestamp === "number" ? timestamp : timestamp.toNumber();
  return new Date(ts * 1000).toLocaleString();
}
