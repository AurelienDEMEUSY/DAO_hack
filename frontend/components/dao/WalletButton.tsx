"use client";

import { useEffect, useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function WalletButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Évite l'erreur d'hydration en ne rendant le bouton que côté client
  if (!mounted) {
    return (
      <div className="wallet-adapter-button-trigger">
        <button className="wallet-adapter-button wallet-adapter-button-trigger" disabled>
          Loading...
        </button>
      </div>
    );
  }

  return <WalletMultiButton />;
}
