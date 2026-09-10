"use client";

import { useQuery } from "@tanstack/react-query";
import { PAYOUT_TIER_3_SHARE } from "@/lib/game/config";

/**
 * The season and its pot, shared by every surface that shows either.
 *
 * One hook because the rewards page and the in-game sheet used to each build
 * their own — both falling back to a hardcoded 42.5 ETH when the API did not
 * return a pool, which it never did. Two copies of a wrong number is how it
 * survived unnoticed.
 */

export type SeasonPot = {
  /** Null when the chain has not answered. Callers must render nothing, not 0. */
  eth: number | null;
  usd: number | null;
  ethUsd: number | null;
  claimableEth: number | null;
  pendingEth: number | null;
  treasuryEth: number | null;
  siloTargetEth: number | undefined;
  stale: boolean;
  reason: string | null;
};

type SeasonResponse = {
  number?: number;
  endsAt?: string;
  pool?: {
    eth: number | null;
    usd: number | null;
    ethUsd: number | null;
    claimableEth: number;
    pendingEth: number;
    treasuryEth: number;
    siloTargetEth: number;
    ok: boolean;
    stale: boolean;
    reason: string | null;
  };
};

export function useSeasonPot({ enabled = true }: { enabled?: boolean } = {}) {
  const query = useQuery<SeasonResponse>({
    queryKey: ["season"],
    queryFn: async () => (await fetch("/api/season")).json(),
    refetchInterval: enabled ? 30_000 : false,
    enabled,
  });

  const pool = query.data?.pool;
  const pot: SeasonPot = {
    eth: typeof pool?.eth === "number" ? pool.eth : null,
    usd: pool?.usd ?? null,
    ethUsd: pool?.ethUsd ?? null,
    claimableEth: pool?.claimableEth ?? null,
    pendingEth: pool?.pendingEth ?? null,
    treasuryEth: pool?.treasuryEth ?? null,
    siloTargetEth: pool?.siloTargetEth,
    stale: Boolean(pool?.stale),
    reason: pool?.reason ?? null,
  };

  return {
    pot,
    endsAt: query.data?.endsAt ?? null,
    seasonNumber: query.data?.number ?? null,
    isLoading: query.isLoading,
  };
}

/**
 * A rough slice of the bottom tier, only ever quoted against a pot the chain
 * confirmed. It is a floor, not a promise: the real split depends on where the
 * farm ranks when the season closes.
 */
export function projectedShareEth(potEth: number | null, sp: number): number {
  if (potEth == null || sp <= 0) return 0;
  return potEth * PAYOUT_TIER_3_SHARE * 0.01;
}
