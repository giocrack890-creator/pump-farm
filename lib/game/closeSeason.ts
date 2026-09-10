import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { SEASON_DURATION_DAYS } from "@/lib/game/config";
import { computePayouts, payoutIdempotencyKey } from "@/lib/game/payout";
import { getAppConfig } from "@/lib/config/appConfig";
import { getPotSnapshot } from "@/lib/pot/snapshot";

/**
 * Closing a season: turn Season Points into a list of what each farmer is owed.
 *
 * Two rules the old cron did not have:
 *
 *   The pool is measured, never assumed. It comes from the on-chain pot, and if
 *   the chain cannot answer, the close is refused. It used to fall back to
 *   MOCK_TREASURY_ETH — a 12.45 ETH stand-in that would have been written into
 *   the season record and split between real wallets.
 *
 *   The season is marked closed inside the same transaction that writes the
 *   payouts. Points could otherwise keep moving while the split was being
 *   computed, so the rows would not add up to what anyone was actually ranked
 *   on.
 *
 * Rows are written with `status: "pending"` and no transaction hash. Sending is
 * a separate, deliberate step (`scripts/payout.ts`) — nothing here moves money.
 */

export type CloseOutcome = {
  ok: boolean;
  dryRun: boolean;
  reason?: string;
  seasonId?: string;
  seasonNumber?: number;
  poolEth?: string;
  ethUsd?: number | null;
  payoutCount?: number;
  computation?: ReturnType<typeof serializeComputation>;
};

function serializeComputation(result: ReturnType<typeof computePayouts>) {
  return {
    totalPool: result.totalPool.toString(),
    reserve: result.reserve.toString(),
    distributable: result.distributable.toString(),
    activeCount: result.activeCount,
    dryRun: result.dryRun,
    payouts: result.payouts.map((p) => ({
      address: p.address,
      amount: p.amount.toString(),
      points: p.points.toString(),
      share: p.share.toString(),
      tier: p.tier,
    })),
    tiers: result.tiers.map((t) => ({
      tier: t.tier,
      poolShare: t.poolShare.toString(),
      poolAmount: t.poolAmount.toString(),
      wallets: t.wallets.length,
    })),
  };
}

export async function closeSeason({
  dryRun = true,
  now = new Date(),
  seasonId,
  force = false,
}: {
  dryRun?: boolean;
  now?: Date;
  seasonId?: string;
  /** Close a season that has not reached its end time yet. */
  force?: boolean;
} = {}): Promise<CloseOutcome> {
  const ending = seasonId
    ? await prisma.season.findUnique({ where: { id: seasonId } })
    : await prisma.season.findFirst({
        // Without `force`, only a season that has actually ended is a
        // candidate. With it, the open one is — that is what a preview from the
        // admin panel is asking about.
        where: force
          ? { closedAt: null }
          : { endsAt: { lte: now }, closedAt: null },
        orderBy: { number: force ? "desc" : "asc" },
      });

  if (!ending) {
    return { ok: true, dryRun, reason: "no season ready to close" };
  }
  if (ending.closedAt) {
    const payoutCount = await prisma.payoutTx.count({
      where: { seasonId: ending.id },
    });
    return {
      ok: true,
      dryRun,
      reason: "season already closed",
      seasonId: ending.id,
      seasonNumber: ending.number,
      payoutCount,
    };
  }
  if (!force && ending.endsAt > now) {
    return {
      ok: false,
      dryRun,
      reason: "season has not ended yet — pass force to close it early",
      seasonId: ending.id,
      seasonNumber: ending.number,
    };
  }

  const [pot, config] = await Promise.all([getPotSnapshot({ fresh: true }), getAppConfig()]);

  // A pool the chain did not confirm is not a pool. Refuse rather than invent.
  if (!pot.ok && !pot.stale) {
    return {
      ok: false,
      dryRun,
      reason: `pot unavailable (${pot.reason ?? "unknown"}) — refusing to close on an unmeasured pool`,
      seasonId: ending.id,
      seasonNumber: ending.number,
    };
  }

  const poolAmount =
    ending.poolAmount != null
      ? new Decimal(ending.poolAmount.toString())
      : new Decimal(pot.potEth);

  const points = await prisma.seasonPoint.findMany({
    where: { seasonId: ending.id },
    include: { wallet: { select: { flaggedSybil: true } } },
  });

  const computation = computePayouts({
    wallets: points.map((p) => ({
      address: p.walletId,
      points: p.points.toString(),
      flaggedSybil: p.wallet.flaggedSybil,
    })),
    poolAmount,
    opsReservePct: config.opsReservePct,
    dryRun,
  });

  const serialized = serializeComputation(computation);

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      seasonId: ending.id,
      seasonNumber: ending.number,
      poolEth: poolAmount.toFixed(),
      ethUsd: pot.ethUsd || null,
      payoutCount: computation.payouts.length,
      computation: serialized,
    };
  }

  const ethUsd = pot.ethUsd > 0 ? pot.ethUsd : null;

  await prisma.$transaction(async (tx) => {
    // Claim the season first: a concurrent close finds it already shut.
    const claimed = await tx.season.updateMany({
      where: { id: ending.id, closedAt: null },
      data: { closedAt: now, poolAmount: poolAmount.toFixed() },
    });
    if (claimed.count === 0) throw new Error("season was closed concurrently");

    for (const payout of computation.payouts) {
      if (payout.amount.lte(0)) continue;
      const key = payoutIdempotencyKey(ending.id, payout.address);
      await tx.payoutTx.upsert({
        where: { idemKey: key },
        create: {
          seasonId: ending.id,
          walletId: payout.address,
          amount: payout.amount.toString(),
          amountUsd: ethUsd
            ? payout.amount.mul(ethUsd).toDecimalPlaces(6).toString()
            : null,
          status: "pending",
          txHash: null,
          idemKey: key,
          dryRun: false,
        },
        update: {},
      });
    }

    // Closing early means the next season starts now, not at the window the
    // old one would have ended in — otherwise there is a gap with no active
    // season, and `ensureCurrentSeason` fills it with a third one.
    const nextStarts = !force && ending.endsAt > now ? ending.endsAt : now;
    const nextEnds = new Date(
      nextStarts.getTime() + SEASON_DURATION_DAYS * 24 * 60 * 60 * 1000,
    );
    await tx.season.upsert({
      where: { number: ending.number + 1 },
      create: {
        number: ending.number + 1,
        startsAt: nextStarts,
        endsAt: nextEnds,
      },
      update: {},
    });
  });

  return {
    ok: true,
    dryRun: false,
    seasonId: ending.id,
    seasonNumber: ending.number,
    poolEth: poolAmount.toFixed(),
    ethUsd,
    payoutCount: computation.payouts.filter((p) => p.amount.gt(0)).length,
    computation: serialized,
  };
}
