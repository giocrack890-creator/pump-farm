import { isDemoDbMode } from "@/lib/demo/farmMemory";
import { getPotSnapshot } from "@/lib/pot/snapshot";

/**
 * Public landing stats — never throws to the client.
 *
 * Every figure here is measured or null. Nothing is invented: an unavailable
 * metric shows as nothing rather than as a plausible number, because the pot
 * and the market cap are the two things a visitor decides to buy on.
 */
export async function GET() {
  const pot = await getPotSnapshot().catch(() => null);

  const marketFields = {
    marketCap: pot?.marketCapUsd ?? null,
    priceUsd: pot?.priceUsd ?? null,
    volume24h: pot?.volume24hUsd ?? null,
    priceChange24h: pot?.change24hPct != null ? pot.change24hPct / 100 : null,
    feedSymbol: pot?.symbol ?? null,
    feedProxy: false,
    pairUrl: null as string | null,
    graduationProgress: pot?.graduationProgress ?? null,
    tokenAddress: pot?.token ?? null,
  };

  const siloUsd = pot?.potUsd ?? null;
  const siloEth = pot?.ok || pot?.stale ? (pot?.potEth ?? null) : null;

  const empty = {
    seedsPlantedToday: null as number | null,
    siloUsd,
    siloEth,
    activeFarmers: null as number | null,
    farmersOnline: null as number | null,
    holders: null as number | null,
    seasonEndsIn: null as { days: number; hours: number } | null,
    mock: true as boolean,
  };

  const headers = {
    "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
  };

  if (isDemoDbMode()) {
    return Response.json({ ...empty, ...marketFields }, { headers });
  }

  try {
    const [{ prisma }, { findActiveSeason, ensureCurrentSeason }, presence] =
      await Promise.all([
        import("@/lib/prisma"),
        import("@/lib/farm/helpers"),
        import("@/lib/admin/presence"),
      ]);

    const now = new Date();
    const dayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    const [plantedToday, wallets, online, season] = await Promise.all([
      prisma.plot.count({ where: { plantedAt: { gte: dayStart } } }),
      prisma.wallet.count(),
      presence.countOnline(),
      (async () =>
        (await findActiveSeason(now)) ?? (await ensureCurrentSeason(now)))(),
    ]);

    const ms = Math.max(0, season.endsAt.getTime() - now.getTime());

    return Response.json(
      {
        seedsPlantedToday: plantedToday,
        siloUsd,
        siloEth,
        activeFarmers: wallets,
        /** Wallets that polled their farm in the last five minutes. */
        farmersOnline: online,
        holders: pot?.holders ?? null,
        ...marketFields,
        seasonEndsIn: {
          days: Math.floor(ms / 86400000),
          hours: Math.floor((ms % 86400000) / 3600000),
        },
        mock: siloUsd == null,
      },
      { headers },
    );
  } catch {
    return Response.json({ ...empty, ...marketFields }, { headers });
  }
}
