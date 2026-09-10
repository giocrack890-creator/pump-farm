import { prisma } from "@/lib/prisma";
import { requireAdmin, isAdminError } from "@/lib/admin/auth";
import { getPotSnapshot } from "@/lib/pot/snapshot";

/**
 * Who is owed what.
 *
 * Full addresses, unlike every public surface — you cannot pay a wallet you
 * only have four characters of. This is the one endpoint `scripts/payout.ts`
 * reads before it sends anything.
 */
export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (isAdminError(guard)) return guard.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "pending";
  const seasonId = searchParams.get("seasonId") ?? undefined;

  const rows = await prisma.payoutTx.findMany({
    where: {
      ...(status === "all" ? {} : { status }),
      ...(seasonId ? { seasonId } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { amount: "desc" }],
    take: 1000,
    include: {
      season: { select: { number: true, closedAt: true } },
    },
  });

  const totals = await prisma.payoutTx.groupBy({
    by: ["status"],
    _count: { _all: true },
    _sum: { amount: true },
  });

  const pot = await getPotSnapshot();

  return Response.json({
    payouts: rows.map((p) => ({
      id: p.id,
      seasonId: p.seasonId,
      seasonNumber: p.season.number,
      address: p.walletId,
      amountEth: p.amount.toString(),
      amountUsd: p.amountUsd?.toString() ?? null,
      status: p.status,
      txHash: p.txHash,
      note: p.note,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
    totals: totals.map((t) => ({
      status: t.status,
      count: t._count._all,
      totalEth: t._sum.amount?.toString() ?? "0",
    })),
    ethUsd: pot.ethUsd || null,
    treasury: pot.treasury,
    treasuryEth: pot.treasuryEth,
  });
}
