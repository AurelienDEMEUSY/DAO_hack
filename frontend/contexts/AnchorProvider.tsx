"use client";

import { FC, ReactNode, createContext, useContext, useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider as AnchorProviderLib, Program } from "@coral-xyz/anchor";
import { DAO_IDL } from "@/lib/anchor/idl";
import { PROGRAM_ID } from "@/lib/anchor/types";

interface AnchorContextType {
  program: Program | null;
  provider: AnchorProviderLib | null;
}

const AnchorContext = createContext<AnchorContextType>({
  program: null,
  provider: null,
});

export const useAnchor = () => useContext(AnchorContext);

interface AnchorProviderProps {
  children: ReactNode;
}

export const AnchorProvider: FC<AnchorProviderProps> = ({ children }) => {
  const { connection } = useConnection();
  const wallet = useWallet();

  const { program, provider } = useMemo(() => {
    if (!wallet.publicKey) {
      return { program: null, provider: null };
    }

    const provider = new AnchorProviderLib(
      connection,
      wallet as any,
      AnchorProviderLib.defaultOptions()
    );

    const program = new Program(DAO_IDL, provider);

    return { program, provider };
  }, [connection, wallet]);

  return (
    <AnchorContext.Provider value={{ program, provider }}>
      {children}
    </AnchorContext.Provider>
  );
};
