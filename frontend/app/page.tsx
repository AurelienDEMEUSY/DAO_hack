"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useDao } from "@/hooks/useDao";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Award, Target, Users, TrendingUp } from "lucide-react";
import { Member, State, formatScore, formatTimestamp } from "@/lib/anchor/types";

export default function HomePage() {
  const { connected, publicKey } = useWallet();
  const { fetchMember, fetchState, initialize, addGenesisMember } = useDao();
  const [member, setMember] = useState<Member | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      loadData();
    }
  }, [connected, publicKey]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [memberData, stateData] = await Promise.all([
        fetchMember(),
        fetchState(),
      ]);
      setMember(memberData);
      setState(stateData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await initialize();
      await loadData();
    } finally {
      setInitializing(false);
    }
  };

  const handleAddGenesisMember = async () => {
    if (!publicKey) return;
    setInitializing(true);
    try {
      await addGenesisMember(publicKey);
      await loadData();
    } finally {
      setInitializing(false);
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="h-10 w-10 text-primary" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Welcome to Hand-e DAO</h1>
          <p className="text-muted-foreground">
            Connect your Phantom wallet to get started
          </p>
        </div>
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

  // DAO not initialized
  if (!state) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Initialize DAO</CardTitle>
            <CardDescription>
              The DAO hasn't been initialized yet. Click below to initialize it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleInitialize} disabled={initializing}>
              {initializing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Initialize DAO
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Member not found - show genesis member registration if applicable
  if (!member) {
    if (state.genesisCount < 3) {
      return (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Join as Genesis Member</CardTitle>
              <CardDescription>
                The DAO has {state.genesisCount}/3 genesis members. Join now to become a founding member!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleAddGenesisMember} disabled={initializing}>
                {initializing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Become Genesis Member
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You are not a member of this DAO. New members must be coopted through governance.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Member dashboard
  const presenceScore = formatScore(member.presenceScore);
  const competenceScore = formatScore(member.competenceScore);

  // Calculate voting power percentage (simplified)
  const totalScores = state.totalPresence.toNumber() * state.totalCompetence.toNumber();
  const memberScores = member.presenceScore.toNumber() * member.competenceScore.toNumber();
  const votingPower = totalScores > 0 ? (memberScores / totalScores * 100).toFixed(2) : "0.00";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Member Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's your reputation overview
        </p>
      </div>

      {/* Status Alert */}
      {!member.isActive && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your membership has been deactivated
          </AlertDescription>
        </Alert>
      )}

      {state.activeMembers < 3 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            DAO is frozen: Less than 3 active members remaining
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Presence Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presence Score</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{presenceScore}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Earned through event attendance
            </p>
          </CardContent>
        </Card>

        {/* Competence Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Competence Score</CardTitle>
            <Award className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{competenceScore}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Earned through peer review
            </p>
          </CardContent>
        </Card>

        {/* Voting Power */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Voting Power</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{votingPower}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on Presence × Competence
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Info */}
      <Card>
        <CardHeader>
          <CardTitle>Member Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <Badge variant={member.isActive ? "default" : "destructive"}>
              {member.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Member Type</span>
            <Badge variant={member.isGenesis ? "default" : "secondary"}>
              {member.isGenesis ? "Genesis Member" : "Coopted Member"}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Joined At</span>
            <span className="text-sm text-muted-foreground">
              {formatTimestamp(member.joinedAt)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">DAO Status</span>
            <span className="text-sm text-muted-foreground">
              {state.activeMembers} active member{state.activeMembers !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Navigate to different sections of the DAO
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <a href="/events">Browse Events</a>
          </Button>
          <Button asChild variant="outline">
            <a href="/governance">View Proposals</a>
          </Button>
          <Button asChild variant="outline">
            <a href="/members">See All Members</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
