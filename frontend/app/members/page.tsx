"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAnchor } from "@/contexts/AnchorProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Users as UsersIcon, Award, Target, TrendingUp, Crown } from "lucide-react";
import { Member, formatScore, formatTimestamp, SCALING_FACTOR } from "@/lib/anchor/types";
import { PublicKey } from "@solana/web3.js";
import { toast } from "sonner";

interface MemberWithKey {
  publicKey: PublicKey;
  account: Member;
}

export default function MembersPage() {
  const { connected } = useWallet();
  const { program } = useAnchor();
  const [members, setMembers] = useState<MemberWithKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    genesisMembers: 0,
    totalPresence: 0,
    totalCompetence: 0,
  });

  useEffect(() => {
    if (connected && program) {
      loadMembers();
    }
  }, [connected, program]);

  const loadMembers = async () => {
    if (!program) return;

    setLoading(true);
    try {
      const allMembers = await program.account.member.all();
      const memberData: MemberWithKey[] = allMembers.map((m) => ({
        publicKey: m.publicKey,
        account: m.account as any,
      }));

      setMembers(memberData);

      // Calculate stats
      const activeCount = memberData.filter((m) => m.account.isActive).length;
      const genesisCount = memberData.filter((m) => m.account.isGenesis).length;
      const totalPres = memberData.reduce(
        (sum, m) => sum + m.account.presenceScore.toNumber(),
        0
      );
      const totalComp = memberData.reduce(
        (sum, m) => sum + m.account.competenceScore.toNumber(),
        0
      );

      setStats({
        totalMembers: memberData.length,
        activeMembers: activeCount,
        genesisMembers: genesisCount,
        totalPresence: totalPres / SCALING_FACTOR.toNumber(),
        totalCompetence: totalComp / SCALING_FACTOR.toNumber(),
      });
    } catch (error) {
      console.error("Error loading members:", error);
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: PublicKey) => {
    const str = address.toString();
    return `${str.slice(0, 4)}...${str.slice(-4)}`;
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Alert className="max-w-md">
          <AlertDescription>
            Please connect your wallet to view DAO members
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Sort members by voting power (presence * competence)
  const sortedMembers = [...members].sort((a, b) => {
    const powerA =
      a.account.presenceScore.toNumber() * a.account.competenceScore.toNumber();
    const powerB =
      b.account.presenceScore.toNumber() * b.account.competenceScore.toNumber();
    return powerB - powerA;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Members</h1>
        <p className="text-muted-foreground">
          View all DAO members and their reputation scores
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeMembers} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Genesis Members</CardTitle>
            <Crown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.genesisMembers}</div>
            <p className="text-xs text-muted-foreground">Founding members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Presence</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPresence.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Cumulative score</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Competence</CardTitle>
            <Award className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompetence.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Cumulative score</p>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Members</CardTitle>
          <CardDescription>
            Members sorted by voting power (Presence × Competence)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No members found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Presence</TableHead>
                    <TableHead className="text-right">Competence</TableHead>
                    <TableHead className="text-right">Voting Power</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMembers.map((member, index) => {
                    const presenceScore = formatScore(member.account.presenceScore);
                    const competenceScore = formatScore(member.account.competenceScore);
                    const votingPower =
                      (member.account.presenceScore.toNumber() *
                        member.account.competenceScore.toNumber()) /
                      (SCALING_FACTOR.toNumber() * SCALING_FACTOR.toNumber());

                    return (
                      <TableRow key={member.publicKey.toString()}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {index + 1}
                            {index === 0 && (
                              <Crown className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {formatAddress(member.account.authority).slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {formatAddress(member.account.authority)}
                              </div>
                              {member.account.isGenesis && (
                                <Badge variant="secondary" className="text-xs">
                                  Genesis
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              member.account.isActive ? "default" : "destructive"
                            }
                          >
                            {member.account.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {presenceScore}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {competenceScore}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {votingPower.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(
                            member.account.joinedAt.toNumber() * 1000
                          ).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>About Reputation Scores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-3">
            <Target className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Presence Score</div>
              <p className="text-muted-foreground">
                Earned through event attendance. +1 for attending, -1 for late registration/withdrawal,
                -2 for ghosting or forgetting to register.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Award className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Competence Score</div>
              <p className="text-muted-foreground">
                Earned through peer review. Members can update each other's competence scores
                based on contributions and expertise.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Voting Power</div>
              <p className="text-muted-foreground">
                Calculated as (Presence/Total Presence) × (Competence/Total Competence).
                This ensures voting power reflects both attendance and contribution quality.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
