import { isDemoDbMode } from "@/lib/demo/farmMemory";
import { fetchTreasurySnapshot } from "@/lib/evm/treasury";
import { ETH_USD_DISPLAY } from "@/lib/game/config";
import { fetchTokenPrice } from "@/lib/priceFeed";

/**
 * Public landing stats — never throws to the client.
 * Live treasury/season when available; market cap only from Dexscreener.
 * Never invents placeholder figures — unavailable metrics stay null.
 */
export async function GET() {
  let market: Awaited<ReturnType<typeof fetchTokenPrice>> | null = null;
  try {
    market = await fetchTokenPrice();
  } catch {
    market = null;
  }

  const liveMarket = market?.source === "dexscreener" ? market : null;
  const marketFields = {
    marketCap: liveMarket?.marketCap ?? null,
    priceUsd: liveMarket?.priceUsd ?? null,
    volume24h: liveMarket?.volume24h ?? null,
    priceChange24h: liveMarket?.priceChange24h ?? null,
    feedSymbol: liveMarket?.symbol ?? null,
    feedProxy: Boolean(liveMarket?.proxy),
    pairUrl: liveMarket?.pairUrl ?? null,
  };

  const empty = {
    seedsPlantedToday: null as number | null,
    siloUsd: null as number | null,
    activeFarmers: null as number | null,
    farmersOnline: null as number | null,
    holders: null as number | null,
    seasonEndsIn: null as { days: number; hours: number } | null,
    mock: true as boolean,
  };

  if (isDemoDbMode()) {
    return Response.json(
      { ...empty, ...marketFields, mock: true },
      {
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
        },
      },
    );
  }

  try {
    const [{ prisma }, { findActiveSeason, ensureCurrentSeason }] = await Promise.all([
      import("@/lib/prisma"),
      import("@/lib/farm/helpers"),
    ]);

    const now = new Date();
    const dayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    const [plantedToday, wallets, season, treasury] = await Promise.all([
      prisma.plot.count({
        where: { plantedAt: { gte: dayStart } },
      }),
      prisma.wallet.count(),
      (async () =>
        (await findActiveSeason(now)) ?? (await ensureCurrentSeason(now)))(),
      fetchTreasurySnapshot(),
    ]);

    const ms = Math.max(0, season.endsAt.getTime() - now.getTime());
    // Only real on-chain balance — never MOCK_TREASURY_ETH / displayBalance stand-in
    const eth = treasury.balanceEth;
    const siloUsd =
      eth != null && Number.isFinite(eth)
        ? Math.round(eth * ETH_USD_DISPLAY)
        : null;

    return Response.json(
      {
        seedsPlantedToday: plantedToday,
        siloUsd,
        activeFarmers: wallets,
        farmersOnline: wallets,
        holders: null as number | null,
        ...marketFields,
        seasonEndsIn: {
          days: Math.floor(ms / 86400000),
          hours: Math.floor((ms % 86400000) / 3600000),
        },
        mock: eth == null,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
        },
      },
    );
  } catch {
    return Response.json(
      { ...empty, ...marketFields },
      {
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
        },
      },
    );
  }
}
