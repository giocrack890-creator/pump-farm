"use client";

import { type ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected, metaMask } from "@wagmi/connectors";
import { robinhoodChain, robinhoodTestnet } from "@/lib/chain/robinhood";

const useTestnet = process.env.NEXT_PUBLIC_RH_NETWORK === "testnet";
const chains = useTestnet
  ? ([robinhoodTestnet, robinhoodChain] as const)
  : ([robinhoodChain, robinhoodTestnet] as const);

export const wagmiConfig = createConfig({
  chains,
  connectors: [
    injected({ shimDisconnect: true }),
    metaMask({ dappMetadata: { name: "Pump Farm" } }),
  ],
  transports: {
    [robinhoodChain.id]: http(
      process.env.NEXT_PUBLIC_RPC_URL ?? robinhoodChain.rpcUrls.default.http[0],
    ),
    [robinhoodTestnet.id]: http("https://rpc.testnet.chain.robinhood.com"),
  },
  ssr: true,
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
