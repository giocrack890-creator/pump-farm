import { prisma } from "@/lib/prisma";
import { requireAdmin, isAdminError, auditAdmin } from "@/lib/admin/auth";
import { ONLINE_WINDOW_MS } from "@/lib/admin/presence";
import { ensureCurrentSeason, findActiveSeason } from "@/lib/farm/helpers";

/** Players, newest activity first, with the current season's points. */
export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (isAdminError(guard)) return guard.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("q")?.trim().toLowerCase();
  const onlineOnly = searchParams.get("online") === "true";
  const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500);

  const now = new Date();
  const season = (await findActiveSeason(now)) ?? (await ensureCurrentSeason(now));

  const wallets = await prisma.wallet.findMany({
    where: {
      ...(onlineOnly
        ? { lastSeenAt: { gte: new Date(Date.now() - ONLINE_WINDOW_MS) } }
        : {}),
      ...(search
        ? {
            OR: [
              { address: { contains: search, mode: "insensitive" } },
              { displayName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ lastSeenAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      seasonPoints: { where: { seasonId: season.id }, take: 1 },
      _count: { select: { plots: true, stakes: true } },
    },
  });

  return Response.json({
    seasonId: season.id,
    onlineWindowMinutes: ONLINE_WINDOW_MS / 60_000,
    players: wallets.map((w) => ({
      address: w.address,
      displayName: w.displayName,
      lastSeenAt: w.lastSeenAt?.toISOString() ?? null,
      online: w.lastSeenAt
        ? Date.now() - w.lastSeenAt.getTime() < ONLINE_WINDOW_MS
        : false,
      createdAt: w.createdAt.toISOString(),
      hypeBalance: w.hypeBalance.toString(),
      harvestStreak: w.harvestStreak,
      flaggedSybil: w.flaggedSybil,
      referredBy: w.referredBy,
      seasonPoints: w.seasonPoints[0]?.points.toString() ?? "0",
      plots: w._count.plots,
      stakes: w._count.stakes,
    })),
  });
}

/**
 * Flag or clear a wallet as a sybil.
 *
 * A flagged wallet keeps playing but is excluded from the payout split — the
 * field existed from the start and nothing could ever set it, so the anti-farm
 * rule was decorative.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if (isAdminError(guard)) return guard.error;

  let body: { address?: string; flaggedSybil?: boolean; note?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const address = body.address?.trim().toLowerCase();
  if (!address || !/^0x[a-f0-9]{40}$/.test(address)) {
    return Response.json({ error: "address must be a 0x address" }, { status: 400 });
  }
  if (typeof body.flaggedSybil !== "boolean") {
    return Response.json({ error: "flaggedSybil must be a boolean" }, { status: 400 });
  }

  try {
    const wallet = await prisma.wallet.update({
      where: { address },
      data: { flaggedSybil: body.flaggedSybil },
    });
    await auditAdmin(guard.identity.actor, "player.flagSybil", {
      address,
      flaggedSybil: body.flaggedSybil,
      note: body.note,
    });
    return Response.json({
      ok: true,
      player: { address: wallet.address, flaggedSybil: wallet.flaggedSybil },
    });
  } catch {
    return Response.json({ error: "wallet not found" }, { status: 404 });
  }
}
