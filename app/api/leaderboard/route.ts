import { prisma } from "@/lib/prisma";
import { ensureCurrentSeason, findActiveSeason } from "@/lib/farm/helpers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") === "alltime" ? "alltime" : "season";
  const limit = Math.min(Number(searchParams.get("limit") ?? "50") || 50, 100);

  if (scope === "alltime") {
    const rows = await prisma.seasonPoint.groupBy({
      by: ["walletId"],
      _sum: { points: true },
      orderBy: { _sum: { points: "desc" } },
      take: limit,
    });

    return Response.json({
      scope,
      entries: rows.map((r, i) => ({
        rank: i + 1,
        address: r.walletId,
        points: r._sum.points?.toString() ?? "0",
      })),
    });
  }

  const now = new Date();
  const season = (await findActiveSeason(now)) ?? (await ensureCurrentSeason(now));

  const rows = await prisma.seasonPoint.findMany({
    where: { seasonId: season.id, points: { gt: 0 } },
    orderBy: { points: "desc" },
    take: limit,
  });

  return Response.json({
    scope: "season",
    season: {
      id: season.id,
      number: season.number,
      endsAt: season.endsAt.toISOString(),
    },
    entries: rows.map((r, i) => ({
      rank: i + 1,
      address: r.walletId,
      points: r.points.toString(),
    })),
  });
}
