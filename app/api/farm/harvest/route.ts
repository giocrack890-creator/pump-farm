import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth/verify";
import {
  ensureCurrentSeason,
  ensureSeasonPoint,
  utcDayKey,
} from "@/lib/farm/helpers";
import {
  getSeedTier,
  getPlotStatus,
  computeHarvestPoints,
  isHarvestable,
} from "@/lib/game/growth";
import { nextStreak, streakMultiplier } from "@/lib/game/hype";
import { bestActiveStakeMultiplier } from "@/lib/evm/staking";
import { GOLDEN_HARVEST_MULTIPLIER } from "@/lib/game/config";

type HarvestBody = { plotId?: string };

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth.error;

  let body: HarvestBody;
  try {
    body = (await request.json()) as HarvestBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.plotId) {
    return Response.json({ error: "plotId is required" }, { status: 400 });
  }

  const now = new Date();
  const today = utcDayKey(now);
  const season = await ensureCurrentSeason(now);
  await ensureSeasonPoint(auth.address, season.id);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const plot = await tx.plot.findUnique({ where: { id: body.plotId } });
      if (!plot || plot.walletId !== auth.address) {
        throw Object.assign(new Error("plot not found"), { status: 404 });
      }

      // Recompute eligibility from DB timestamps — never trust client status/SP.
      if (!isHarvestable(plot, now)) {
        const status = getPlotStatus(plot, now);
        throw Object.assign(
          new Error(`plot not harvestable (status=${status})`),
          { status: 409 },
        );
      }

      const tier = plot.seedTier ? getSeedTier(plot.seedTier) : null;
      if (!tier) {
        throw Object.assign(new Error("plot has invalid seed tier"), {
          status: 400,
        });
      }

      const wallet = await tx.wallet.findUniqueOrThrow({
        where: { address: auth.address },
        include: { stakes: true },
      });

      const golden = await tx.goldenHarvestEvent.findFirst({
        where: { active: true, endsAt: { gt: now } },
        orderBy: { startedAt: "desc" },
      });

      const status = getPlotStatus(plot, now);
      const blighted = status === "blighted";
      const stakeMult = bestActiveStakeMultiplier(wallet.stakes, now);

      const newStreak = nextStreak(
        wallet.lastHarvestDay,
        today,
        wallet.harvestStreak,
      );
      const streakMult = streakMultiplier(newStreak);
      const goldenMult = golden ? GOLDEN_HARVEST_MULTIPLIER : 1;

      const pointsAwarded = computeHarvestPoints({
        baseYield: tier.baseYieldSp,
        stakeMult,
        streakMult,
        goldenMult,
        blighted,
      });

      const sp = await tx.seasonPoint.findUniqueOrThrow({
        where: {
          walletId_seasonId: {
            walletId: auth.address,
            seasonId: season.id,
          },
        },
      });

      const newPoints = new Decimal(sp.points.toString()).plus(pointsAwarded);

      await tx.seasonPoint.update({
        where: { id: sp.id },
        data: { points: newPoints.toFixed() },
      });

      await tx.wallet.update({
        where: { address: auth.address },
        data: {
          harvestStreak: newStreak,
          lastHarvestDay: today,
        },
      });

      const cleared = await tx.plot.update({
        where: { id: plot.id },
        data: {
          seedTier: null,
          plantedAt: null,
          maturesAt: null,
          harvestedAt: now,
          status: "empty",
        },
      });

      return {
        plot: cleared,
        pointsAwarded,
        seasonPoints: newPoints.toFixed(),
        blighted,
        multipliers: { stake: stakeMult, streak: streakMult, golden: goldenMult },
        harvestStreak: newStreak,
      };
    });

    return Response.json({
      plotId: result.plot.id,
      status: "empty",
      pointsAwarded: result.pointsAwarded,
      seasonPoints: result.seasonPoints,
      blighted: result.blighted,
      multipliers: result.multipliers,
      harvestStreak: result.harvestStreak,
      harvestedAt: now.toISOString(),
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "harvest failed";
    return Response.json({ error: message }, { status });
  }
}
