"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * The runtime config, read from the server rather than baked into the bundle.
 *
 * The contract address used to come from `NEXT_PUBLIC_TOKEN_MINT`, which Next
 * inlines at build time — so the CA card on the landing page could only change
 * with a deploy, and would happily disagree with the server about which launch
 * the pot belongs to. Now both read the same row.
 */

export type PublicConfig = {
  tokenAddress: string | null;
  tokenTicker: string;
  treasuryAddress: string | null;
  stakeEscrowAddress: string | null;
  siloTargetEth: number;
  tokenLive: boolean;
  chainId: number;
  explorer: string | null;
};

export function useAppConfig() {
  const query = useQuery<PublicConfig>({
    queryKey: ["app-config"],
    queryFn: async () => (await fetch("/api/config")).json(),
    // The token changes about once in a launch's life; no need to poll hard.
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  return {
    config: query.data ?? null,
    tokenAddress: query.data?.tokenAddress ?? null,
    ticker: query.data?.tokenTicker ?? "FARM",
    tokenLive: Boolean(query.data?.tokenLive),
    explorer: query.data?.explorer ?? null,
  };
}
