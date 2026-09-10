import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth/verify";
import {
  ensureCurrentSeason,
  ensureSeasonPoint,
  findActiveSeason,
} from "@/lib/farm/helpers";
import { getPlotStatus, computeGrowthProgress } from "@/lib/game/growth";
import { bestActiveStakeMultiplier } from "@/lib/evm/staking";
import {
  GOLDEN_HARVEST_MULTIPLIER,
  STARTER_PLOTS,
} from "@/lib/game/config";
import { streakMultiplier } from "@/lib/game/hype";
import { weatherFromPriceChange } from "@/lib/game/weather";
import { fetchTokenPrice } from "@/lib/priceFeed";
import { demoFarmSnapshot, isDemoDbMode } from "@/lib/demo/farmMemory";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth.error;

  if (isDemoDbMode()) {
    return Response.json(demoFarmSnapshot());
  }

  const now = new Date();
  const season = (await findActiveSeason(now)) ?? (await ensureCurrentSeason(now));
  await ensureSeasonPoint(auth.address, season.id);

  const wallet = await prisma.wallet.findUnique({
    where: { address: auth.address },
    include: {
      plots: { orderBy: { index: "asc" } },
      stakes: { orderBy: { lockedAt: "desc" } },
      seasonPoints: { where: { seasonId: season.id }, take: 1 },
    },
  });

  if (!wallet) {
    return Response.json({ error: "wallet not found" }, { status: 404 });
  }

  // Backfill plots if somehow missing.
  if (wallet.plots.length < STARTER_PLOTS) {
    const existing = new Set(wallet.plots.map((p) => p.index));
    const missing = Array.from({ length: STARTER_PLOTS }, (_, i) => i).filter(
      (i) => !existing.has(i),
    );
    if (missing.length) {
      await prisma.plot.createMany({
        data: missing.map((index) => ({
          walletId: wallet.address,
          index,
          status: "empty",
        })),
      });
      wallet.plots = await prisma.plot.findMany({
        where: { walletId: wallet.address },
        orderBy: { index: "asc" },
      });
    }
  }

  const golden = await prisma.goldenHarvestEvent.findFirst({
    where: { active: true, endsAt: { gt: now } },
    orderBy: { startedAt: "desc" },
  });

  const stakeMult = bestActiveStakeMultiplier(wallet.stakes, now);
  const streakMult = streakMultiplier(wallet.harvestStreak);
  const goldenMult = golden ? GOLDEN_HARVEST_MULTIPLIER : 1;
  const price = await fetchTokenPrice();
  const weather = weatherFromPriceChange(price.priceChangeM5);

  const sp = wallet.seasonPoints[0];

  const plots = wallet.plots.map((plot) => {
    const status = getPlotStatus(
      {
        seedTier: plot.seedTier,
        plantedAt: plot.plantedAt,
        maturesAt: plot.maturesAt,
      },
      now,
    );
    const progress =
      plot.plantedAt && plot.maturesAt
        ? computeGrowthProgress(plot.plantedAt, plot.maturesAt, now)
        : 0;
    return {
      id: plot.id,
      index: plot.index,
      seedTier: plot.seedTier,
      plantedAt: plot.plantedAt?.toISOString() ?? null,
      maturesAt: plot.maturesAt?.toISOString() ?? null,
      harvestedAt: plot.harvestedAt?.toISOString() ?? null,
      status,
      progress,
    };
  });

  return Response.json({
    wallet: {
      address: wallet.address,
      displayName: wallet.displayName,
      hypeBalance: wallet.hypeBalance.toString(),
      harvestStreak: wallet.harvestStreak,
      lastHarvestDay: wallet.lastHarvestDay,
      lastDailyHypeAt: wallet.lastDailyHypeAt?.toISOString() ?? null,
      referralCode: wallet.referralCode,
      referredBy: wallet.referredBy,
      flaggedSybil: wallet.flaggedSybil,
      hasCompletedTutorial: wallet.hasCompletedTutorial,
    },
    season: {
      id: season.id,
      number: season.number,
      startsAt: season.startsAt.toISOString(),
      endsAt: season.endsAt.toISOString(),
      msRemaining: Math.max(0, season.endsAt.getTime() - now.getTime()),
    },
    seasonPoints: sp?.points.toString() ?? "0",
    plots,
    multipliers: {
      stake: stakeMult,
      streak: streakMult,
      golden: goldenMult,
    },
    goldenHarvest: golden
      ? {
          id: golden.id,
          startedAt: golden.startedAt.toISOString(),
          endsAt: golden.endsAt.toISOString(),
          priceChangePct: golden.priceChangePct.toString(),
          active: true,
        }
      : null,
    weather,
    price,
    stakes: wallet.stakes.map((s) => ({
      id: s.id,
      amount: s.amount.toString(),
      lockDays: s.lockDays,
      lockedAt: s.lockedAt.toISOString(),
      unlockAt: s.unlockAt.toISOString(),
      txHash: s.txHash,
      active: s.unlockAt.getTime() > now.getTime(),
    })),
  });
}
