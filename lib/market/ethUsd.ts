import { WETH } from "@/lib/chain/robinhood";

/**
 * ETH/USD for turning wei of fees into a dollar pot.
 *
 * GeckoTerminal first because it prices WETH on Robinhood Chain itself — the
 * same book the fees are earned on — with CoinGecko behind it for when that
 * endpoint is rate-limited.
 *
 * Returns 0 when nothing answers and nothing has been cached. Callers must
 * treat 0 as "unknown" and show no dollar figure at all: a wrong pot is worse
 * than a missing one, which is exactly what the old fixed ETH_USD constant did.
 */

let cached: { usd: number; at: number } | null = null;
const TTL_MS = 60_000;

async function getJson(url: string, timeoutMs = 6_000): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function fromGeckoTerminal(): Promise<number> {
  const json = (await getJson(
    `https://api.geckoterminal.com/api/v2/networks/robinhood/tokens/${WETH.toLowerCase()}`,
  )) as { data?: { attributes?: { price_usd?: string } } };
  const usd = Number(json?.data?.attributes?.price_usd);
  if (!(usd > 0)) throw new Error("no price");
  return usd;
}

async function fromCoinGecko(): Promise<number> {
  const json = (await getJson(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
  )) as { ethereum?: { usd?: number } };
  const usd = Number(json?.ethereum?.usd);
  if (!(usd > 0)) throw new Error("no price");
  return usd;
}

export async function ethUsdPrice(): Promise<number> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.usd;

  for (const source of [fromGeckoTerminal, fromCoinGecko]) {
    try {
      const usd = await source();
      cached = { usd, at: Date.now() };
      return usd;
    } catch {
      /* try next */
    }
  }

  // Stale beats invented: keep serving the last good price rather than a guess.
  return cached?.usd ?? 0;
}

/** Last known ETH/USD without hitting the network. 0 when never fetched. */
export function lastEthUsd(): number {
  return cached?.usd ?? 0;
}
