"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Calendar, Vote, Users } from "lucide-react";

export function Navbar() {
  const { connected } = useWallet();

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary" />
              <span className="text-xl font-bold">Hand-e DAO</span>
            </Link>

            {connected && (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/">
                  <Button variant="ghost" size="sm">
                    <Home className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <Link href="/events">
                  <Button variant="ghost" size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    Events
                  </Button>
                </Link>
                <Link href="/governance">
                  <Button variant="ghost" size="sm">
                    <Vote className="h-4 w-4 mr-2" />
                    Governance
                  </Button>
                </Link>
                <Link href="/members">
                  <Button variant="ghost" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Members
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="wallet-adapter-button-trigger">
            <WalletMultiButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
