/**
 * Dexscreener price feed for landing / Golden Harvest.
 * Until $HOOD launches we can point DEXSCREENER_* at a live proxy pair
 * (e.g. MEME on Robinhood Chain) to verify the plumbing.
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
  /** True when feed is a stand-in token, not $HOOD yet. */
  proxy: boolean;
  source: "dexscreener" | "mock";
  fetchedAt: string;
};

/** @deprecated Prefer PriceSnapshot */
export type PriceQuote = PriceSnapshot;

const cache: { at: number; data: PriceSnapshot | null } = { at: 0, data: null };
const TTL_MS = 15_000;
const MOCK_PRICE = 0.00042;

/**
 * Temporary live plumbing stand-in: MEME on Robinhood Chain (Dexscreener).
 * Used only when DEXSCREENER_* is unset and $HOOD is not live yet.
 * Override anytime via env; set NEXT_PUBLIC_PRICE_PROXY=false when $HOOD pair is real.
 */
const DEFAULT_PROXY_FEED = {
  chain: "robinhood",
  pairId: "0x4b7c86491df95f366b31217b2950d2c5136a2f19b6879613eac73d0e69092a1a",
  tokenAddress: "0x385F4f8ae47651ce5F58F5265395a669f8281e18",
} as const;

type DexPair = {
  url?: string;
  priceUsd?: string;
  marketCap?: number;
  fdv?: number;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  priceChange?: { m5?: number; h1?: number; h24?: number };
  baseToken?: { symbol?: string; name?: string; address?: string };
  quoteToken?: { symbol?: string };
  chainId?: string;
  pairAddress?: string;
};

function usingExplicitDexEnv(): boolean {
  return Boolean(
    process.env.DEXSCREENER_PAIR_ID?.trim() ||
      process.env.DEXSCREENER_TOKEN_ADDRESS?.trim(),
  );
}

function isProxyFeed(): boolean {
  if (process.env.NEXT_PUBLIC_PRICE_PROXY === "false") return false;
  if (process.env.NEXT_PUBLIC_PRICE_PROXY === "true") return true;
  // Built-in MEME stand-in (no explicit DEXSCREENER_* env) = proxy
  return !usingExplicitDexEnv();
}

function snapshotFromPair(
  pair: DexPair | undefined,
  pairId: string,
  fetchedAt: string,
): PriceSnapshot {
  return {
    priceUsd: Number(pair?.priceUsd ?? 0),
    priceChangeM5: Number(pair?.priceChange?.m5 ?? 0) / 100,
    priceChangeH1: Number(pair?.priceChange?.h1 ?? 0) / 100,
    priceChange24h: Number(pair?.priceChange?.h24 ?? 0) / 100,
    volume24h: Number(pair?.volume?.h24 ?? 0),
    // Literal circulating market cap from Dexscreener — not unit price, not FDV stand-in.
    marketCap: typeof pair?.marketCap === "number" ? pair.marketCap : null,
    fdv: typeof pair?.fdv === "number" ? pair.fdv : null,
    liquidityUsd:
      typeof pair?.liquidity?.usd === "number" ? pair.liquidity.usd : null,
    symbol: pair?.baseToken?.symbol ?? null,
    name: pair?.baseToken?.name ?? null,
    pairId: pair?.pairAddress ?? pairId,
    pairUrl: pair?.url,
    proxy: isProxyFeed(),
    source: "dexscreener",
    fetchedAt,
  };
}

export async function fetchTokenPrice(): Promise<PriceSnapshot> {
  const now = Date.now();
  if (cache.data && now - cache.at < TTL_MS) return cache.data;

  const pairId =
    process.env.DEXSCREENER_PAIR_ID?.trim() ||
    (!usingExplicitDexEnv() ? DEFAULT_PROXY_FEED.pairId : null);
  const tokenAddress =
    process.env.DEXSCREENER_TOKEN_ADDRESS?.trim() ||
    (!usingExplicitDexEnv() ? DEFAULT_PROXY_FEED.tokenAddress : null);
  const fetchedAt = new Date().toISOString();

  if (!pairId && !tokenAddress) {
    const mock: PriceSnapshot = {
      priceUsd: MOCK_PRICE,
      priceChangeM5: 0.02,
      priceChangeH1: 0.08,
      priceChange24h: 0.02,
      volume24h: 125_000,
      marketCap: null,
      fdv: null,
      liquidityUsd: null,
      symbol: null,
      name: null,
      pairId: null,
      proxy: false,
      source: "mock",
      fetchedAt,
    };
    cache.data = mock;
    cache.at = now;
    return mock;
  }

  try {
    const chain =
      process.env.DEXSCREENER_CHAIN?.trim() ||
      (!usingExplicitDexEnv() ? DEFAULT_PROXY_FEED.chain : undefined);
    let url: string;
    if (pairId && chain) {
      url = `https://api.dexscreener.com/latest/dex/pairs/${encodeURIComponent(chain)}/${pairId}`;
    } else if (tokenAddress) {
      url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;
    } else {
      url = `https://api.dexscreener.com/latest/dex/tokens/${pairId}`;
    }

    const res = await fetch(url, {
      next: { revalidate: 15 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Dexscreener HTTP ${res.status}`);

    const data = (await res.json()) as {
      pair?: DexPair;
      pairs?: DexPair[];
    };

    let pair = data.pair;
    if (!pair && data.pairs?.length) {
      // Prefer configured chain, then highest liquidity
      const preferred = chain
        ? data.pairs.filter((p) => p.chainId === chain)
        : data.pairs;
      const pool = preferred.length ? preferred : data.pairs;
      pair = pool.reduce((best, p) =>
        Number(p.liquidity?.usd ?? 0) > Number(best.liquidity?.usd ?? 0) ? p : best,
      );
    }

    const snapshot = snapshotFromPair(pair, pairId ?? tokenAddress!, fetchedAt);
    if (!snapshot.priceUsd) throw new Error("Dexscreener returned empty price");

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
        marketCap: null,
        fdv: null,
        liquidityUsd: null,
        symbol: null,
        name: null,
        pairId,
        proxy: isProxyFeed(),
        source: "mock",
        fetchedAt,
      }
    );
  }
}

/** Alias used by older call sites. */
export const fetchFarmPrice = fetchTokenPrice;
