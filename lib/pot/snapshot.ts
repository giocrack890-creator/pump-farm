import { formatEther } from "viem";
import { getAppConfig } from "@/lib/config/appConfig";
import { ethUsdPrice } from "@/lib/market/ethUsd";
import {
  readCirculatingSupply,
  readCreatorFees,
  readTreasuryBalance,
} from "@/lib/pons/fees";
import { resolveLaunch } from "@/lib/pons/launch";
import { launchPriceEth } from "@/lib/pons/price";
import { fetchMarketExtras } from "@/lib/market/extras";

/**
 * The Silo, read from chain: what the launch has actually earned in fees.
 *
 *   claimable  sitting in the Pons escrow, withdrawable by the creator now
 *   pending    the creator's share of what the hook still holds unswept
 *   treasury   already claimed and sitting in the payout wallet
 *
 * All three are the same money at different hops, so the pot is their sum.
 * Counting only the escrow would make the pot read $0 the moment the fees are
 * actually collected, which is exactly backwards.
 *
 * Nothing here is ever invented. When the chain cannot answer, the last good
 * snapshot is held and flagged `stale`; when there has never been one, the pot
 * is `null` and the UI shows nothing rather than a number nobody owes. The
 * prize a season pays is a share of this figure — a decorative one would be a
 * lie about real money.
 */

export type PotSnapshot = {
  ok: boolean;
  reason: string | null;
  stale: boolean;
  token: string | null;
  symbol: string | null;
  venue: "curve" | "v4" | "unknown" | null;
  creator: string | null;
  treasury: string | null;
  ethUsd: number;
  claimableEth: number;
  pendingEth: number;
  treasuryEth: number;
  potEth: number;
  /** Null when ETH/USD is unknown — never a stand-in rate. */
  potUsd: number | null;
  claimableUsd: number | null;
  pendingUsd: number | null;
  treasuryUsd: number | null;
  /** Raw memecoin-leg fees, shown but never summed into the pot. */
  pendingTokenRaw: string;
  escrowTokenRaw: string;
  graduationProgress: number | null;
  priceEth: number;
  priceUsd: number | null;
  marketCapUsd: number | null;
  circulatingMarketCapUsd: number | null;
  totalSupply: number;
  circulatingSupply: number;
  volume24hUsd: number | null;
  change24hPct: number | null;
  holders: number | null;
  curve: string | null;
  poolId: string | null;
  siloTargetEth: number;
  updatedAt: number;
};

const TTL_MS = 15_000;

let cache: { snapshot: PotSnapshot; at: number } | null = null;
/** The last snapshot the chain actually confirmed. */
let lastGood: PotSnapshot | null = null;
let inFlight: Promise<PotSnapshot> | null = null;

function emptySnapshot(reason: string, siloTargetEth: number): PotSnapshot {
  return {
    ok: false,
    reason,
    stale: false,
    token: null,
    symbol: null,
    venue: null,
    creator: null,
    treasury: null,
    ethUsd: 0,
    claimableEth: 0,
    pendingEth: 0,
    treasuryEth: 0,
    potEth: 0,
    potUsd: null,
    claimableUsd: null,
    pendingUsd: null,
    treasuryUsd: null,
    pendingTokenRaw: "0",
    escrowTokenRaw: "0",
    graduationProgress: null,
    priceEth: 0,
    priceUsd: null,
    marketCapUsd: null,
    circulatingMarketCapUsd: null,
    totalSupply: 0,
    circulatingSupply: 0,
    volume24hUsd: null,
    change24hPct: null,
    holders: null,
    curve: null,
    poolId: null,
    siloTargetEth,
    updatedAt: Date.now(),
  };
}

async function build(): Promise<PotSnapshot> {
  const config = await getAppConfig();

  if (!config.tokenAddress) {
    return emptySnapshot("no token configured", config.siloTargetEth);
  }

  const launch = await resolveLaunch(config.tokenAddress, {
    creatorOverride: config.creatorAddress,
  });
  // The treasury defaults to whoever the launch credits — usually the same
  // wallet, but configurable because it need not be.
  const treasury = config.treasuryAddress ?? launch.creator;

  const [fees, ethUsd, supply, priceEth, treasuryWei, extras] = await Promise.all([
    readCreatorFees(launch),
    ethUsdPrice(),
    readCirculatingSupply(launch),
    launchPriceEth(launch),
    readTreasuryBalance(treasury),
    fetchMarketExtras(launch.token),
  ]);

  const claimableEth = Number(formatEther(fees.claimableWei));
  const pendingEth = Number(formatEther(fees.pendingWei));
  const treasuryEth = Number(formatEther(treasuryWei));
  const potEth = claimableEth + pendingEth + treasuryEth;

  const usd = (eth: number) => (ethUsd > 0 ? eth * ethUsd : null);

  // The chain leads on price: no rate limit, no indexing delay. The APIs only
  // fill in what it cannot give — 24h volume and change, which need history.
  const priceUsd =
    priceEth > 0 && ethUsd > 0 ? priceEth * ethUsd : (extras.priceUsd ?? null);

  /**
   * Price × *total* supply, which is what every other tracker quotes for a
   * launch like this — Pons, GeckoTerminal and Dexscreener all agree on that
   * basis. Circulating is arguably truer while a curve still holds half the
   * supply, but this figure's job is to be comparable: a holder seeing half the
   * number next to the chart concludes the site is broken, not precise. The
   * circulating figure is reported alongside for anyone who wants it.
   */
  const marketCapUsd =
    priceUsd && supply.totalSupply > 0
      ? priceUsd * supply.totalSupply
      : (extras.marketCapUsd ?? null);

  const usable = fees.ok && launch.venue !== "unknown";

  return {
    ok: usable,
    reason: usable ? null : (fees.reason ?? "not a pons launch"),
    stale: false,
    token: launch.token,
    symbol: launch.symbol || null,
    venue: launch.venue,
    creator: fees.creator,
    treasury: treasury ?? null,
    ethUsd,
    claimableEth,
    pendingEth,
    treasuryEth,
    potEth,
    potUsd: usd(potEth),
    claimableUsd: usd(claimableEth),
    pendingUsd: usd(pendingEth),
    treasuryUsd: usd(treasuryEth),
    pendingTokenRaw: fees.pendingTokenRaw.toString(),
    escrowTokenRaw: fees.escrowTokenRaw.toString(),
    graduationProgress: launch.curve?.graduationProgress ?? null,
    priceEth,
    priceUsd,
    marketCapUsd,
    circulatingMarketCapUsd:
      priceUsd && supply.circulatingSupply > 0
        ? priceUsd * supply.circulatingSupply
        : null,
    totalSupply: supply.totalSupply,
    circulatingSupply: supply.circulatingSupply,
    volume24hUsd: extras.volume24hUsd,
    change24hPct: extras.change24hPct,
    holders: extras.holders,
    curve: launch.curve?.address ?? null,
    poolId: launch.pool?.poolId ?? null,
    siloTargetEth: config.siloTargetEth,
    updatedAt: Date.now(),
  };
}

export async function getPotSnapshot(
  { fresh = false }: { fresh?: boolean } = {},
): Promise<PotSnapshot> {
  if (!fresh && cache && Date.now() - cache.at < TTL_MS) return cache.snapshot;
  // One upstream read no matter how many requests land in the same tick.
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const snapshot = await build();
      if (snapshot.ok) lastGood = snapshot;
      cache = { snapshot, at: Date.now() };
      return snapshot;
    } catch (err) {
      const reason = err instanceof Error ? err.message : "pot read failed";
      // A pot we have already seen does not become unknown because one poll
      // failed. Hold it, flag it stale, and keep trying.
      const snapshot: PotSnapshot = lastGood
        ? { ...lastGood, ok: false, stale: true, reason, updatedAt: Date.now() }
        : emptySnapshot(reason, (await getAppConfig()).siloTargetEth);
      cache = { snapshot, at: Date.now() };
      return snapshot;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
