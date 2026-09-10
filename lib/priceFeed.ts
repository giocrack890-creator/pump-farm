import { getPotSnapshot } from "@/lib/pot/snapshot";

/**
 * The price of the launch, for the parts of the game that react to it: weather,
 * Golden Harvest, and the market card.
 *
 * This used to be a Dexscreener call pointed at a stand-in token (a MEME pair
 * hardcoded as a "proxy feed") so the plumbing could be tested before $FARM
 * existed. That stand-in is gone: the price now comes from the same on-chain
 * snapshot the pot does, so the number driving Golden Harvest is the number the
 * pot is denominated in, and there is no way for the two to describe different
 * coins.
 *
 * A fresh Pons launch trades on a bonding curve that no indexer knows about for
 * a while — the chain answers immediately, which is exactly when the game is
 * most alive.
 */

export type PriceSnapshot = {
  priceUsd: number;
  priceChangeM5: number;
  priceChangeH1: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number | null;
  fdv: number | null;
  liquidityUsd: number | null;
  symbol: string | null;
  name: string | null;
  pairId: string | null;
  pairUrl?: string;
  /** True until a token is configured — the UI must not quote a price. */
  proxy: boolean;
  source: "chain" | "api" | "none";
  fetchedAt: string;
};

/** @deprecated Prefer PriceSnapshot */
export type PriceQuote = PriceSnapshot;

/**
 * Short-window price movement, kept in memory so weather can react faster than
 * the sampling cron. Ten minutes of samples is all the Golden Harvest rule
 * needs, and it is derived from the same reads the pot already makes.
 */
const WINDOW_MS = 10 * 60_000;
const samples: { at: number; price: number }[] = [];

function recordSample(price: number, at: number): void {
  if (!(price > 0)) return;
  const last = samples[samples.length - 1];
  // One sample per 15s is plenty; the pot itself is cached for that long.
  if (last && at - last.at < 15_000) return;
  samples.push({ at, price });
  while (samples.length && at - samples[0]!.at > WINDOW_MS) samples.shift();
}

function changeSince(ms: number, price: number, now: number): number {
  const cutoff = now - ms;
  const oldest = samples.find((s) => s.at >= cutoff) ?? samples[0];
  if (!oldest || !(oldest.price > 0)) return 0;
  return (price - oldest.price) / oldest.price;
}

export async function fetchTokenPrice(): Promise<PriceSnapshot> {
  const pot = await getPotSnapshot();
  const now = Date.now();
  const fetchedAt = new Date(now).toISOString();

  const priceUsd = pot.priceUsd ?? 0;
  recordSample(priceUsd, now);

  return {
    priceUsd,
    priceChangeM5: changeSince(5 * 60_000, priceUsd, now),
    priceChangeH1: changeSince(WINDOW_MS, priceUsd, now),
    // 24h needs history no in-memory window has; the APIs are the only source.
    priceChange24h: pot.change24hPct != null ? pot.change24hPct / 100 : 0,
    volume24h: pot.volume24hUsd ?? 0,
    marketCap: pot.marketCapUsd,
    fdv: pot.marketCapUsd,
    liquidityUsd: null,
    symbol: pot.symbol,
    name: pot.symbol,
    pairId: pot.poolId ?? pot.curve,
    proxy: !pot.token,
    source: pot.token ? (pot.priceEth > 0 ? "chain" : "api") : "none",
    fetchedAt,
  };
}

/** Alias used by older call sites. */
export const fetchFarmPrice = fetchTokenPrice;

/** Price movement over the rolling window, for the Golden Harvest check. */
export function rollingPriceChange(windowMs = WINDOW_MS): number {
  const now = Date.now();
  const latest = samples[samples.length - 1];
  if (!latest) return 0;
  return changeSince(windowMs, latest.price, now);
}
