import { prisma } from "@/lib/prisma";
import { requireAdmin, isAdminError } from "@/lib/admin/auth";
import { countOnline, listOnline, ONLINE_WINDOW_MS } from "@/lib/admin/presence";
import { getAppConfig } from "@/lib/config/appConfig";
import { getPotSnapshot } from "@/lib/pot/snapshot";
import { ensureCurrentSeason, findActiveSeason } from "@/lib/farm/helpers";

/** Everything the ops panel renders on load, in one round trip. */
export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (isAdminError(guard)) return guard.error;

  const now = new Date();
  const season =
    (await findActiveSeason(now)) ?? (await ensureCurrentSeason(now));

  const [pot, config, online, onlineCount, wallets, plantedToday, payouts, audit] =
    await Promise.all([
      getPotSnapshot(),
      getAppConfig({ fresh: true }),
      listOnline({ seasonId: season.id }),
      countOnline(),
      prisma.wallet.count(),
      prisma.plot.count({
        where: {
          plantedAt: {
            gte: new Date(
              Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
            ),
          },
        },
      }),
      prisma.payoutTx.groupBy({
        by: ["status"],
        _count: { _all: true },
        _sum: { amount: true },
      }),
      prisma.adminAudit.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
    ]);

  return Response.json({
    now: now.toISOString(),
    identity: guard.identity,
    pot,
    config,
    season: {
      id: season.id,
      number: season.number,
      startsAt: season.startsAt.toISOString(),
      endsAt: season.endsAt.toISOString(),
      closedAt: season.closedAt?.toISOString() ?? null,
      msRemaining: Math.max(0, season.endsAt.getTime() - now.getTime()),
    },
    counts: {
      online: onlineCount,
      wallets,
      plantedToday,
      onlineWindowMinutes: ONLINE_WINDOW_MS / 60_000,
    },
    online,
    payouts: payouts.map((row) => ({
      status: row.status,
      count: row._count._all,
      totalEth: row._sum.amount?.toString() ?? "0",
    })),
    audit: audit.map((a) => ({
      id: a.id,
      actor: a.actor,
      action: a.action,
      detail: a.detail,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}
