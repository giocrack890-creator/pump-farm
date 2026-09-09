import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth/verify";
import { getSeedTier, getPlotStatus, computeMaturesAt } from "@/lib/game/growth";
import { referralBurst } from "@/lib/game/hype";
import type { SeedTierId } from "@/lib/game/config";
import { demoPlant, isDemoDbMode } from "@/lib/demo/farmMemory";

type PlantBody = {
  plotId?: string;
  seedTier?: string;
};

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth.error;

  let body: PlantBody;
  try {
    body = (await request.json()) as PlantBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { plotId, seedTier } = body;
  if (!plotId || !seedTier) {
    return Response.json(
      { error: "plotId and seedTier are required" },
      { status: 400 },
    );
  }

  if (isDemoDbMode()) {
    try {
      return Response.json(demoPlant(plotId, seedTier));
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : "Plant failed" },
        { status: 400 },
      );
    }
  }

  const tier = getSeedTier(seedTier);
  if (!tier) {
    return Response.json({ error: "invalid seedTier" }, { status: 400 });
  }

  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const plot = await tx.plot.findUnique({ where: { id: plotId } });
      if (!plot || plot.walletId !== auth.address) {
        throw Object.assign(new Error("plot not found"), { status: 404 });
      }

      const status = getPlotStatus(
        {
          seedTier: plot.seedTier,
          plantedAt: plot.plantedAt,
          maturesAt: plot.maturesAt,
        },
        now,
      );
      if (status !== "empty") {
        throw Object.assign(new Error("plot is not empty"), { status: 409 });
      }

      const wallet = await tx.wallet.findUniqueOrThrow({
        where: { address: auth.address },
      });

      const balance = new Decimal(wallet.hypeBalance.toString());
      const cost = new Decimal(tier.hypeCost);
      if (balance.lt(cost)) {
        throw Object.assign(new Error("insufficient hype"), { status: 400 });
      }

      const plantedAt = now;
      const maturesAt = computeMaturesAt(plantedAt, tier.id as SeedTierId);
      const newBalance = balance.minus(cost);

      const updatedPlot = await tx.plot.update({
        where: { id: plot.id },
        data: {
          seedTier: tier.id,
          plantedAt,
          maturesAt,
          harvestedAt: null,
          status: "growing",
        },
      });

      await tx.wallet.update({
        where: { address: auth.address },
        data: { hypeBalance: newBalance.toFixed() },
      });

      await tx.hypeLedger.create({
        data: {
          walletId: auth.address,
          amount: cost.neg().toFixed(),
          reason: `plant:${tier.id}:${plot.id}`,
        },
      });

      // First-ever plant by a referred wallet → one-time Hype burst to referrer.
      const priorPlants = await tx.plot.count({
        where: {
          walletId: auth.address,
          plantedAt: { not: null },
          id: { not: plot.id },
        },
      });

      if (priorPlants === 0 && wallet.referredBy) {
        const burst = new Decimal(referralBurst);
        const referrer = await tx.wallet.findUniqueOrThrow({
          where: { address: wallet.referredBy },
        });
        const referrerBalance = new Decimal(referrer.hypeBalance.toString()).plus(
          burst,
        );
        await tx.wallet.update({
          where: { address: wallet.referredBy },
          data: { hypeBalance: referrerBalance.toFixed() },
        });
        await tx.hypeLedger.create({
          data: {
            walletId: wallet.referredBy,
            amount: burst.toFixed(),
            reason: `referral_burst:${auth.address}`,
          },
        });
      }

      return {
        plot: updatedPlot,
        hypeBalance: newBalance.toFixed(),
        maturesAt,
      };
    });

    return Response.json({
      plotId: result.plot.id,
      seedTier: result.plot.seedTier,
      plantedAt: result.plot.plantedAt?.toISOString(),
      maturesAt: result.maturesAt.toISOString(),
      status: "growing",
      hypeBalance: result.hypeBalance,
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "plant failed";
    return Response.json({ error: message }, { status });
  }
}
