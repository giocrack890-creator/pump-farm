import { prisma } from "@/lib/prisma";
import { ensureCurrentSeason, findActiveSeason } from "@/lib/farm/helpers";
import { computePayouts } from "@/lib/game/payout";
import { getPotSnapshot } from "@/lib/pot/snapshot";
import { getDemoWallet, isDemoDbMode } from "@/lib/demo/farmMemory";
import { canUseAuthDb } from "@/lib/auth/db";

type Entry = {
  rank: number;
  address: string;
  displayName: string | null;
  points: string;
  farmSize: number;
  projectedPayout: string;
};

function projectedMap(
  wallets: { address: string; points: string; flaggedSybil?: boolean }[],
  poolEth: number,
) {
  try {
    const result = computePayouts({
      wallets,
      poolAmount: poolEth,
    });
    return new Map(
      result.payouts.map((p) => [p.address.toLowerCase(), p.amount.toFixed(6)]),
    );
  } catch {
    return new Map<string, string>();
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") === "alltime" ? "alltime" : "season";
  const limit = Math.min(Number(searchParams.get("limit") ?? "50") || 50, 100);

  // Demo / no-DB: only the local in-memory farmer — never invent fake ranks.
  if (isDemoDbMode() || !canUseAuthDb()) {
    const w = getDemoWallet();
    const points = Number(w.seasonPoints) || 0;
    const entries: Entry[] =
      points > 0
        ? [
            {
              rank: 1,
              address: w.address,
              displayName: w.displayName ?? null,
              points: String(points),
              farmSize: w.plots?.length ?? 0,
              projectedPayout: "0",
            },
          ]
        : [];
    return Response.json({
      scope,
      demo: true,
      entries,
      note: "Demo mode — connect a real DB to rank all wallets.",
    });
  }

  // The projected payouts on the board are a share of the real pot. When the
  // chain has not answered there is no pool to project against, so every
  // projection reads zero rather than a share of an invented figure.
  const pot = await getPotSnapshot();
  const poolEth = pot.ok || pot.stale ? pot.potEth : 0;

  if (scope === "alltime") {
    const grouped = await prisma.seasonPoint.groupBy({
      by: ["walletId"],
      _sum: { points: true },
      orderBy: { _sum: { points: "desc" } },
      take: limit,
    });

    const wallets = await prisma.wallet.findMany({
      where: { address: { in: grouped.map((g) => g.walletId) } },
      select: {
        address: true,
        displayName: true,
        flaggedSybil: true,
        _count: { select: { plots: true } },
      },
    });
    const byId = new Map(wallets.map((w) => [w.address, w]));

    const payoutInput = grouped.map((g) => ({
      address: g.walletId,
      points: g._sum.points?.toString() ?? "0",
      flaggedSybil: byId.get(g.walletId)?.flaggedSybil,
    }));
    const projected = projectedMap(payoutInput, poolEth);

    const entries: Entry[] = grouped.map((g, i) => {
      const w = byId.get(g.walletId);
      return {
        rank: i + 1,
        address: g.walletId,
        displayName: w?.displayName ?? null,
        points: g._sum.points?.toString() ?? "0",
        farmSize: w?._count.plots ?? 0,
        projectedPayout: projected.get(g.walletId.toLowerCase()) ?? "0",
      };
    });

    return Response.json({ scope, demo: false, entries });
  }

  const now = new Date();
  const season = (await findActiveSeason(now)) ?? (await ensureCurrentSeason(now));

  const rows = await prisma.seasonPoint.findMany({
    where: { seasonId: season.id, points: { gt: 0 } },
    orderBy: { points: "desc" },
    take: limit,
    include: {
      wallet: {
        select: {
          address: true,
          displayName: true,
          flaggedSybil: true,
          _count: { select: { plots: true } },
        },
      },
    },
  });

  const payoutInput = rows.map((r) => ({
    address: r.walletId,
    points: r.points.toString(),
    flaggedSybil: r.wallet.flaggedSybil,
  }));
  const projected = projectedMap(payoutInput, poolEth);

  const entries: Entry[] = rows.map((r, i) => ({
    rank: i + 1,
    address: r.walletId,
    displayName: r.wallet.displayName,
    points: r.points.toString(),
    farmSize: r.wallet._count.plots,
    projectedPayout: projected.get(r.walletId.toLowerCase()) ?? "0",
  }));

  return Response.json({
    scope: "season",
    demo: false,
    season: {
      id: season.id,
      number: season.number,
      endsAt: season.endsAt.toISOString(),
    },
    entries,
  });
}
