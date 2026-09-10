import { isDemoDbMode } from "@/lib/demo/farmMemory";
import { fetchTreasurySnapshot } from "@/lib/evm/treasury";
import { ETH_USD_DISPLAY } from "@/lib/game/config";

/**
 * Public landing stats — never throws to the client.
 * Uses live treasury/season when available; otherwise seeded demo numbers.
 */
export async function GET() {
  const seeded = {
    seedsPlantedToday: 1842,
    siloUsd: 12450,
    activeFarmers: 936,
    farmersOnline: 936,
    holders: null as number | null,
    marketCap: null as number | null,
    seasonEndsIn: { days: 4, hours: 11 },
    mock: true as boolean,
  };

  if (isDemoDbMode()) {
    return Response.json(seeded);
  }

  try {
    const [{ prisma }, { findActiveSeason, ensureCurrentSeason }] = await Promise.all([
      import("@/lib/prisma"),
      import("@/lib/farm/helpers"),
    ]);

    const now = new Date();
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

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
    const eth = Number(treasury.displayBalance ?? treasury.balanceEth ?? 0);
    const siloUsd = Number.isFinite(eth) ? Math.round(eth * ETH_USD_DISPLAY) : seeded.siloUsd;

    return Response.json({
      seedsPlantedToday: plantedToday || seeded.seedsPlantedToday,
      siloUsd: siloUsd || seeded.siloUsd,
      activeFarmers: wallets || seeded.activeFarmers,
      farmersOnline: wallets || seeded.activeFarmers,
      holders: null as number | null,
      marketCap: null as number | null,
      seasonEndsIn: {
        days: Math.floor(ms / 86400000),
        hours: Math.floor((ms % 86400000) / 3600000),
      },
      mock: treasury.balanceEth === null || plantedToday === 0,
    });
  } catch {
    return Response.json(seeded);
  }
}
