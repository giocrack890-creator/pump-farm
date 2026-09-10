/**
 * Dexscreener price feed for $FARM.
 * Used by /api/price and the Golden Harvest cron.
 */

export type PriceSnapshot = {
  priceUsd: number;
  priceChangeM5: number;
  priceChangeH1: number;
  priceChange24h: number;
  volume24h: number;
  pairId: string | null;
  pairUrl?: string;
  source: "dexscreener" | "mock";
  fetchedAt: string;
};

/** @deprecated Prefer PriceSnapshot */
export type PriceQuote = PriceSnapshot;

const cache: { at: number; data: PriceSnapshot | null } = { at: 0, data: null };
const TTL_MS = 30_000;
const MOCK_PRICE = 0.00042;

export async function fetchTokenPrice(): Promise<PriceSnapshot> {
  const now = Date.now();
  if (cache.data && now - cache.at < TTL_MS) return cache.data;

  const pairId = process.env.DEXSCREENER_PAIR_ID ?? null;
  const fetchedAt = new Date().toISOString();

  if (!pairId) {
    const mock: PriceSnapshot = {
      priceUsd: MOCK_PRICE,
      priceChangeM5: 0.02,
      priceChangeH1: 0.08,
      priceChange24h: 0.02,
      volume24h: 125_000,
      pairId: null,
      source: "mock",
      fetchedAt,
    };
    cache.data = mock;
    cache.at = now;
    return mock;
  }

  try {
    // Robinhood Chain is EVM — never use pairs/solana/. Prefer explicit chain slug;
    // fall back to token lookup by pair/token address (chain-agnostic).
    const chain = process.env.DEXSCREENER_CHAIN?.trim();
    const url = chain
      ? `https://api.dexscreener.com/latest/dex/pairs/${encodeURIComponent(chain)}/${pairId}`
      : `https://api.dexscreener.com/latest/dex/tokens/${pairId}`;
    const res = await fetch(url, {
      next: { revalidate: 30 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Dexscreener HTTP ${res.status}`);

    const data = (await res.json()) as {
      pair?: {
        priceUsd?: string;
        url?: string;
        priceChange?: { m5?: number; h1?: number; h24?: number };
        volume?: { h24?: number };
      };
      pairs?: Array<{
        priceUsd?: string;
        url?: string;
        priceChange?: { m5?: number; h1?: number; h24?: number };
        volume?: { h24?: number };
      }>;
    };
    const pair = data.pair ?? data.pairs?.[0];
    const snapshot: PriceSnapshot = {
      priceUsd: Number(pair?.priceUsd ?? 0),
      priceChangeM5: Number(pair?.priceChange?.m5 ?? 0) / 100,
      priceChangeH1: Number(pair?.priceChange?.h1 ?? 0) / 100,
      priceChange24h: Number(pair?.priceChange?.h24 ?? 0) / 100,
      volume24h: Number(pair?.volume?.h24 ?? 0),
      pairId,
      pairUrl: pair?.url,
      source: "dexscreener",
      fetchedAt,
    };
    cache.data = snapshot;
    cache.at = now;
    return snapshot;
  } catch {
    return (
      cache.data ?? {
        priceUsd: 0,
        priceChangeM5: 0,
        priceChangeH1: 0,
        priceChange24h: 0,
        volume24h: 0,
        pairId,
        source: "mock",
        fetchedAt,
      }
    );
  }
}

/** Alias used by older call sites. */
export const fetchFarmPrice = fetchTokenPrice;
