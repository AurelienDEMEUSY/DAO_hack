"use client";

import { useCallback } from "react";
import { useAnchor } from "@/contexts/AnchorProvider";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  getStatePDA,
  getMemberPDA,
  getEventPDA,
  getRegistrationPDA,
  getProposalPDA,
  getVoteRecordPDA,
  State,
  Member,
  TrackSession,
  EventRegistration,
  Proposal,
  VoteRecord,
} from "@/lib/anchor/types";
import { toast } from "sonner";

export function useDao() {
  const { program } = useAnchor();
  const { publicKey } = useWallet();

  // Fetch State
  const fetchState = useCallback(async (): Promise<State | null> => {
    if (!program) return null;
    try {
      const [statePDA] = getStatePDA();
      const state = await program.account.state.fetch(statePDA);
      return state as any;
    } catch (error) {
      console.error("Error fetching state:", error);
      return null;
    }
  }, [program]);

  // Fetch Member
  const fetchMember = useCallback(
    async (authority?: PublicKey): Promise<Member | null> => {
      if (!program) return null;
      const memberAuthority = authority || publicKey;
      if (!memberAuthority) return null;

      try {
        const [memberPDA] = getMemberPDA(memberAuthority);
        const member = await program.account.member.fetch(memberPDA);
        return member as any;
      } catch (error) {
        console.error("Error fetching member:", error);
        return null;
      }
    },
    [program, publicKey]
  );

  // Fetch Event
  const fetchEvent = useCallback(
    async (eventId: BN): Promise<TrackSession | null> => {
      if (!program) return null;
      try {
        const [eventPDA] = getEventPDA(eventId);
        const event = await program.account.trackSession.fetch(eventPDA);
        return event as any;
      } catch (error) {
        console.error("Error fetching event:", error);
        return null;
      }
    },
    [program]
  );

  // Fetch Proposal
  const fetchProposal = useCallback(
    async (proposalId: BN): Promise<Proposal | null> => {
      if (!program) return null;
      try {
        const [proposalPDA] = getProposalPDA(proposalId);
        const proposal = await program.account.proposal.fetch(proposalPDA);
        return proposal as any;
      } catch (error) {
        console.error("Error fetching proposal:", error);
        return null;
      }
    },
    [program]
  );

  // Initialize DAO
  const initialize = useCallback(async () => {
    if (!program || !publicKey) {
      toast.error("Wallet not connected");
      return;
    }

    try {
      const [statePDA] = getStatePDA();

      const tx = await program.methods
        .initialize()
        .accounts({
          state: statePDA,
          authority: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      toast.success("DAO initialized successfully!");
      return tx;
    } catch (error: any) {
      console.error("Error initializing DAO:", error);
      toast.error(error.message || "Failed to initialize DAO");
    }
  }, [program, publicKey]);

  // Add Genesis Member
  const addGenesisMember = useCallback(
    async (memberAuthority: PublicKey) => {
      if (!program || !publicKey) {
        toast.error("Wallet not connected");
        return;
      }

      try {
        const [statePDA] = getStatePDA();
        const [memberPDA] = getMemberPDA(memberAuthority);

        const tx = await program.methods
          .addGenesisMember()
          .accounts({
            state: statePDA,
            member: memberPDA,
            memberAuthority: memberAuthority,
            authority: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        toast.success("Genesis member added successfully!");
        return tx;
      } catch (error: any) {
        console.error("Error adding genesis member:", error);
        toast.error(error.message || "Failed to add genesis member");
      }
    },
    [program, publicKey]
  );

  // Create Event
  const createEvent = useCallback(
    async (startTime: number, description: string) => {
      if (!program || !publicKey) {
        toast.error("Wallet not connected");
        return;
      }

      try {
        const state = await fetchState();
        if (!state) throw new Error("State not found");

        const [statePDA] = getStatePDA();
        const [eventPDA] = getEventPDA(state.eventCounter);
        const [memberPDA] = getMemberPDA(publicKey);

        const tx = await program.methods
          .createEvent(new BN(startTime), description)
          .accounts({
            state: statePDA,
            event: eventPDA,
            member: memberPDA,
            creator: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        toast.success("Event created successfully!");
        return tx;
      } catch (error: any) {
        console.error("Error creating event:", error);
        toast.error(error.message || "Failed to create event");
      }
    },
    [program, publicKey, fetchState]
  );

  // Register for Event
  const registerForEvent = useCallback(
    async (eventId: BN) => {
      if (!program || !publicKey) {
        toast.error("Wallet not connected");
        return;
      }

      try {
        const [statePDA] = getStatePDA();
        const [eventPDA] = getEventPDA(eventId);
        const [memberPDA] = getMemberPDA(publicKey);
        const [registrationPDA] = getRegistrationPDA(eventId, publicKey);

        const tx = await program.methods
          .registerForEvent()
          .accounts({
            state: statePDA,
            event: eventPDA,
            member: memberPDA,
            registration: registrationPDA,
            authority: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        toast.success("Registered for event successfully!");
        return tx;
      } catch (error: any) {
        console.error("Error registering for event:", error);
        toast.error(error.message || "Failed to register for event");
      }
    },
    [program, publicKey]
  );

  // Withdraw from Event
  const withdrawFromEvent = useCallback(
    async (eventId: BN) => {
      if (!program || !publicKey) {
        toast.error("Wallet not connected");
        return;
      }

      try {
        const [statePDA] = getStatePDA();
        const [eventPDA] = getEventPDA(eventId);
        const [memberPDA] = getMemberPDA(publicKey);
        const [registrationPDA] = getRegistrationPDA(eventId, publicKey);

        const tx = await program.methods
          .withdrawFromEvent()
          .accounts({
            state: statePDA,
            event: eventPDA,
            member: memberPDA,
            registration: registrationPDA,
            authority: publicKey,
          })
          .rpc();

        toast.success("Withdrawn from event successfully!");
        return tx;
      } catch (error: any) {
        console.error("Error withdrawing from event:", error);
        toast.error(error.message || "Failed to withdraw from event");
      }
    },
    [program, publicKey]
  );

  // Create Proposal
  const createProposal = useCallback(
    async (
      title: string,
      description: string,
      proposalType: { critical: {} } | { operational: {} },
      votingPeriod: number
    ) => {
      if (!program || !publicKey) {
        toast.error("Wallet not connected");
        return;
      }

      try {
        const state = await fetchState();
        if (!state) throw new Error("State not found");

        const [statePDA] = getStatePDA();
        const [proposalPDA] = getProposalPDA(state.proposalCounter);
        const [memberPDA] = getMemberPDA(publicKey);

        const tx = await program.methods
          .createProposal(title, description, proposalType, new BN(votingPeriod))
          .accounts({
            state: statePDA,
            proposal: proposalPDA,
            member: memberPDA,
            proposer: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        toast.success("Proposal created successfully!");
        return tx;
      } catch (error: any) {
        console.error("Error creating proposal:", error);
        toast.error(error.message || "Failed to create proposal");
      }
    },
    [program, publicKey, fetchState]
  );

  // Vote on Proposal
  const vote = useCallback(
    async (proposalId: BN, support: boolean) => {
      if (!program || !publicKey) {
        toast.error("Wallet not connected");
        return;
      }

      try {
        const [statePDA] = getStatePDA();
        const [proposalPDA] = getProposalPDA(proposalId);
        const [memberPDA] = getMemberPDA(publicKey);
        const [voteRecordPDA] = getVoteRecordPDA(proposalId, publicKey);

        const tx = await program.methods
          .vote(support)
          .accounts({
            state: statePDA,
            proposal: proposalPDA,
            member: memberPDA,
            voteRecord: voteRecordPDA,
            voter: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        toast.success("Vote recorded successfully!");
        return tx;
      } catch (error: any) {
        console.error("Error voting:", error);
        toast.error(error.message || "Failed to vote");
      }
    },
    [program, publicKey]
  );

  return {
    fetchState,
    fetchMember,
    fetchEvent,
    fetchProposal,
    initialize,
    addGenesisMember,
    createEvent,
    registerForEvent,
    withdrawFromEvent,
    createProposal,
    vote,
  };
}
