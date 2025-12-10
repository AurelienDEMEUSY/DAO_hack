"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useDao } from "@/hooks/useDao";
import { useAnchor } from "@/contexts/AnchorProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Vote as VoteIcon, ThumbsUp, ThumbsDown } from "lucide-react";
import { BN } from "@coral-xyz/anchor";
import { Proposal, ProposalStatus, formatTimestamp } from "@/lib/anchor/types";
import { toast } from "sonner";

export default function GovernancePage() {
  const { connected } = useWallet();
  const { program } = useAnchor();
  const { createProposal, vote } = useDao();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [proposalType, setProposalType] = useState<"critical" | "operational">("operational");
  const [votingPeriodDays, setVotingPeriodDays] = useState("7");

  useEffect(() => {
    if (connected && program) {
      loadProposals();
    }
  }, [connected, program]);

  const loadProposals = async () => {
    if (!program) return;

    setLoading(true);
    try {
      const allProposals = await program.account.proposal.all();
      setProposals(allProposals.map(p => p.account as any));
    } catch (error) {
      console.error("Error loading proposals:", error);
      toast.error("Failed to load proposals");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    try {
      const votingPeriod = parseInt(votingPeriodDays) * 86400; // Convert days to seconds
      const propType = proposalType === "critical" ? { critical: {} } : { operational: {} };

      await createProposal(title, description, propType, votingPeriod);
      setCreateDialogOpen(false);
      setTitle("");
      setDescription("");
      setProposalType("operational");
      setVotingPeriodDays("7");
      await loadProposals();
    } catch (error) {
      console.error("Error creating proposal:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (proposalId: BN, support: boolean) => {
    try {
      await vote(proposalId, support);
      await loadProposals();
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Alert className="max-w-md">
          <AlertDescription>
            Please connect your wallet to view and participate in governance
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const activeProposals = proposals.filter(p => p.status.active);
  const passedProposals = proposals.filter(p => p.status.passed);
  const rejectedProposals = proposals.filter(p => p.status.rejected);

  const renderProposal = (proposal: Proposal) => {
    const now = Math.floor(Date.now() / 1000);
    const votingEnded = now >= proposal.votingEndsAt.toNumber();
    const timeLeft = proposal.votingEndsAt.toNumber() - now;
    const daysLeft = Math.floor(timeLeft / 86400);
    const hoursLeft = Math.floor((timeLeft % 86400) / 3600);

    const totalVotes = proposal.votesFor.add(proposal.votesAgainst);
    const votesForPercent = totalVotes.isZero()
      ? 0
      : proposal.votesFor.mul(new BN(100)).div(totalVotes).toNumber();

    const isCritical = proposal.proposalType.critical !== undefined;

    return (
      <Card key={proposal.id.toString()}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg">{proposal.title}</CardTitle>
                <Badge variant={isCritical ? "destructive" : "default"}>
                  {isCritical ? "Critical" : "Operational"}
                </Badge>
              </div>
              <CardDescription className="line-clamp-2">
                {proposal.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Voting Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Votes For</span>
              <span className="font-medium">{votesForPercent}%</span>
            </div>
            <Progress value={votesForPercent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>For: {proposal.votesFor.toString()}</span>
              <span>Against: {proposal.votesAgainst.toString()}</span>
            </div>
          </div>

          {/* Time Info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {votingEnded ? "Ended" : "Ends in"}:
            </span>
            <span>
              {votingEnded
                ? formatTimestamp(proposal.votingEndsAt)
                : `${daysLeft}d ${hoursLeft}h`}
            </span>
          </div>

          {/* Voting Buttons */}
          {!votingEnded && proposal.status.active && (
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => handleVote(proposal.id, true)}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Vote For
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => handleVote(proposal.id, false)}
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                Vote Against
              </Button>
            </div>
          )}

          {/* Threshold Info for Critical Proposals */}
          {isCritical && (
            <Alert>
              <AlertDescription className="text-xs">
                Critical proposals require absolute majority (&gt; 50% of total voting power)
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Governance</h1>
          <p className="text-muted-foreground">
            Participate in DAO decision-making through proposals and voting
          </p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Proposal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Proposal</DialogTitle>
              <DialogDescription>
                Submit a proposal for the DAO to vote on
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateProposal} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Proposal title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={128}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your proposal..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  maxLength={512}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {description.length}/512 characters
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Proposal Type</Label>
                  <Select value={proposalType} onValueChange={(v: any) => setProposalType(v)}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operational">Operational</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {proposalType === "critical"
                      ? "Requires absolute majority (member changes)"
                      : "Requires relative majority (operations)"}
                  </p>
                </div>

                <div>
                  <Label htmlFor="votingPeriod">Voting Period (days)</Label>
                  <Input
                    id="votingPeriod"
                    type="number"
                    min="1"
                    max="30"
                    value={votingPeriodDays}
                    onChange={(e) => setVotingPeriodDays(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Proposal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">
              Active ({activeProposals.length})
            </TabsTrigger>
            <TabsTrigger value="passed">
              Passed ({passedProposals.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({rejectedProposals.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeProposals.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">No active proposals</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeProposals.map(renderProposal)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="passed" className="space-y-4">
            {passedProposals.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">No passed proposals</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {passedProposals.map(renderProposal)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedProposals.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">No rejected proposals</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rejectedProposals.map(renderProposal)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
