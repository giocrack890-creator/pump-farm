import { prisma } from "@/lib/prisma";
import { requireAdmin, isAdminError, auditAdmin } from "@/lib/admin/auth";
import { closeSeason } from "@/lib/game/closeSeason";
import { getAppConfig } from "@/lib/config/appConfig";

/** Season history with what each close actually produced. */
export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (isAdminError(guard)) return guard.error;

  const seasons = await prisma.season.findMany({
    orderBy: { number: "desc" },
    take: 20,
    include: {
      _count: { select: { payoutTxLog: true, seasonPoints: true } },
    },
  });

  return Response.json({
    seasons: seasons.map((s) => ({
      id: s.id,
      number: s.number,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      closedAt: s.closedAt?.toISOString() ?? null,
      poolAmount: s.poolAmount?.toString() ?? null,
      payoutCount: s._count.payoutTxLog,
      farmerCount: s._count.seasonPoints,
    })),
  });
}

/**
 * Close a season by hand — a preview by default.
 *
 * `dryRun: false` needs the `payoutsEnabled` flag on, the same gate the cron
 * respects. Nothing is sent either way: this only writes what is owed.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if (isAdminError(guard)) return guard.error;

  let body: { dryRun?: boolean; seasonId?: string; force?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const config = await getAppConfig({ fresh: true });
  const wantsLive = body.dryRun === false;
  const dryRun = !(wantsLive && config.payoutsEnabled);

  const result = await closeSeason({
    dryRun,
    seasonId: body.seasonId,
    force: body.force === true,
  });

  if (!dryRun) {
    await auditAdmin(guard.identity.actor, "season.close", {
      seasonId: result.seasonId,
      poolEth: result.poolEth,
      payoutCount: result.payoutCount,
    });
  }

  return Response.json({
    ...result,
    payoutsEnabled: config.payoutsEnabled,
    ...(wantsLive && !config.payoutsEnabled
      ? { note: "stayed dry-run: turn on payoutsEnabled first" }
      : {}),
  });
}
