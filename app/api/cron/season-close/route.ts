import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { isCronAuthorized, ensureCurrentSeason } from "@/lib/farm/helpers";
import { computePayouts, payoutIdempotencyKey } from "@/lib/game/payout";
import { SEASON_DURATION_DAYS } from "@/lib/game/config";
import { fetchTreasurySnapshot } from "@/lib/evm/treasury";

/**
 * Season close cron.
 * Protected by CRON_SECRET. Defaults to dry-run (?dryRun=true or omitted).
 * Pass ?dryRun=false to persist PayoutTx rows (still does NOT send on-chain
 * transfers — wire treasury signing separately after audit).
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  // Idempotent dry-run by default — never accidentally pay.
  const dryRun = searchParams.get("dryRun") !== "false";
  const now = new Date();

  const ending = await prisma.season.findFirst({
    where: {
      endsAt: { lte: now },
      closedAt: null,
    },
    orderBy: { number: "asc" },
  });

  if (!ending) {
    // Ensure a live season still exists for the next window.
    await ensureCurrentSeason(now);
    return Response.json({
      ok: true,
      dryRun,
      message: "no season ready to close",
    });
  }

  // Already has payout rows → treat as closed for idempotency.
  const existingPayouts = await prisma.payoutTx.count({
    where: { seasonId: ending.id },
  });
  if (existingPayouts > 0 && ending.closedAt) {
    return Response.json({
      ok: true,
      dryRun,
      seasonId: ending.id,
      message: "season already closed",
      payoutCount: existingPayouts,
    });
  }

  const treasury = await fetchTreasurySnapshot();
  const poolAmount =
    ending.poolAmount !== null && ending.poolAmount !== undefined
      ? new Decimal(ending.poolAmount.toString())
      : new Decimal(treasury.displayBalance);

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
  });

  const serializeComputation = () => ({
    totalPool: computation.totalPool.toString(),
    reserve: computation.reserve.toString(),
    distributable: computation.distributable.toString(),
    activeCount: computation.activeCount,
    dryRun: computation.dryRun,
    payouts: computation.payouts.map((p) => ({
      address: p.address,
      amount: p.amount.toString(),
      points: p.points.toString(),
      share: p.share.toString(),
      tier: p.tier,
    })),
    tiers: computation.tiers.map((t) => ({
      tier: t.tier,
      poolShare: t.poolShare.toString(),
      poolAmount: t.poolAmount.toString(),
      wallets: t.wallets.map((w) => ({
        address: w.address,
        amount: w.amount.toString(),
        points: w.points.toString(),
        share: w.share.toString(),
        tier: w.tier,
      })),
    })),
  });

  if (dryRun) {
    return Response.json({
      ok: true,
      dryRun: true,
      seasonId: ending.id,
      seasonNumber: ending.number,
      poolAmount: poolAmount.toFixed(),
      computation: serializeComputation(),
    });
  }

  // Persist payout plan idempotently (no on-chain send in this MVP path).
  await prisma.$transaction(async (tx) => {
    for (const payout of computation.payouts) {
      const key = payoutIdempotencyKey(ending.id, payout.address);
      await tx.payoutTx.upsert({
        where: { idemKey: key },
        create: {
          seasonId: ending.id,
          walletId: payout.address,
          amount: payout.amount.toString(),
          txHash: `pending:${key}`,
          idemKey: key,
          dryRun: false,
        },
        update: {},
      });
    }

    await tx.season.update({
      where: { id: ending.id },
      data: {
        closedAt: now,
        poolAmount: poolAmount.toFixed(),
      },
    });

    // Open next season immediately.
    const nextStarts = ending.endsAt > now ? ending.endsAt : now;
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

  return Response.json({
    ok: true,
    dryRun: false,
    seasonId: ending.id,
    seasonNumber: ending.number,
    poolAmount: poolAmount.toFixed(),
    computation,
    note: "PayoutTx rows recorded with pending: txHash. On-chain send is a separate audited step.",
  });
}
