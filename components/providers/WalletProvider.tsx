"use client";

import { type ReactNode, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppKitProvider } from "@reown/appkit/react";
import { WagmiProvider } from "wagmi";
import {
  getAppKitOptions,
  getWagmiAdapter,
  REOWN_PROJECT_ID,
} from "@/lib/reown/config";

/**
 * AppKit EVM (Robinhood Chain) + SIWX when NEXT_PUBLIC_REOWN_PROJECT_ID is set.
 * Surfaces MetaMask / Robinhood Wallet / WalletConnect — not Solana wallets.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const options = useMemo(() => getAppKitOptions(), []);
  const adapter = useMemo(() => getWagmiAdapter(), []);

  if (!options || !REOWN_PROJECT_ID || !adapter) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return (
    <WagmiProvider config={adapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AppKitProvider {...options}>{children}</AppKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
