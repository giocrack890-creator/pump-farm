import { ROBINHOOD_EXPLORER } from "@/lib/chain/robinhood";

/**
 * The parts of a market card the chain cannot answer: 24h volume, 24h change,
 * and the holder count. Everything else — price, supply, market cap — is read
 * on chain, because a fresh Pons launch is not indexed anywhere for a while and
 * the free API tiers throttle long before a live card needs them to.
 *
 * Every source is optional. A miss returns nulls rather than throwing: the pot
 * must not go dark because GeckoTerminal had a bad minute.
 */

export type MarketExtras = {
  priceUsd: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  change24hPct: number | null;
  holders: number | null;
  iconUrl: string | null;
};

const EMPTY: MarketExtras = {
  priceUsd: null,
  marketCapUsd: null,
  volume24hUsd: null,
  change24hPct: null,
  holders: null,
  iconUrl: null,
};

const TTL_MS = 30_000;
const cache = new Map<string, { data: MarketExtras; at: number }>();

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n !== 0 ? n : null;
}

async function tryJson(url: string, timeoutMs = 6_000): Promise<unknown> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchMarketExtras(token: string): Promise<MarketExtras> {
  const key = token.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  const [gecko, pools, dex] = await Promise.all([
    tryJson(`https://api.geckoterminal.com/api/v2/networks/robinhood/tokens/${key}`),
    tryJson(
      `https://api.geckoterminal.com/api/v2/networks/robinhood/tokens/${key}/pools?page=1`,
    ),
    tryJson(`https://api.dexscreener.com/latest/dex/tokens/${token}`),
  ]);

  const attrs = (gecko as { data?: { attributes?: Record<string, unknown> } })
    ?.data?.attributes;
  const topPool = (pools as { data?: { attributes?: Record<string, unknown> }[] })
    ?.data?.[0]?.attributes;
  const dexPair = (dex as { pairs?: Record<string, unknown>[] })?.pairs?.[0];

  const volume = attrs?.volume_usd as { h24?: unknown } | undefined;
  const poolVolume = topPool?.volume_usd as { h24?: unknown } | undefined;
  const poolChange = topPool?.price_change_percentage as
    | { h24?: unknown }
    | undefined;
  const dexChange = dexPair?.priceChange as { h24?: unknown } | undefined;
  const dexVolume = dexPair?.volume as { h24?: unknown } | undefined;

  const iconUrl = (attrs?.image_url as string | undefined) ?? null;

  const data: MarketExtras = {
    priceUsd:
      num(attrs?.price_usd) ??
      num(topPool?.base_token_price_usd) ??
      num(dexPair?.priceUsd),
    marketCapUsd:
      num(attrs?.market_cap_usd) ??
      num(attrs?.fdv_usd) ??
      num(topPool?.fdv_usd) ??
      num(dexPair?.marketCap) ??
      num(dexPair?.fdv),
    volume24hUsd:
      num(volume?.h24) ?? num(poolVolume?.h24) ?? num(dexVolume?.h24),
    change24hPct: num(poolChange?.h24) ?? num(dexChange?.h24),
    holders: null,
    iconUrl: iconUrl && iconUrl !== "missing.png" ? iconUrl : null,
  };

  cache.set(key, { data, at: Date.now() });
  return data;
}

/** Explorer link for a token, for the admin panel and the CA card. */
export function explorerTokenUrl(token: string): string {
  return `${ROBINHOOD_EXPLORER.replace(/\/$/, "")}/token/${token}`;
}

export const EMPTY_MARKET_EXTRAS = EMPTY;
