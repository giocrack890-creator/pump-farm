import { prisma } from "@/lib/prisma";

/**
 * Who is actually playing right now.
 *
 * `Wallet.lastSeenAt` already existed for offline worker progress but nothing
 * on the real database path ever wrote it, so "farmers online" was reporting
 * the total number of wallets ever created — a number that only goes up and
 * says nothing about who is here.
 *
 * A write per farm poll would be a write every few seconds per player, so the
 * timestamp is only pushed when it is already stale. The throttle map is
 * per-instance, which is fine: the worst case is a few redundant writes after a
 * cold start, not a wrong reading.
 */

/** A player polling their farm is here; one who stopped five minutes ago is not. */
export const ONLINE_WINDOW_MS = 5 * 60_000;
const WRITE_EVERY_MS = 60_000;

const lastWrite = new Map<string, number>();

export async function touchWallet(address: string): Promise<void> {
  const now = Date.now();
  const previous = lastWrite.get(address);
  if (previous && now - previous < WRITE_EVERY_MS) return;
  lastWrite.set(address, now);

  // Presence is a nice-to-have; never fail a farm read over it.
  try {
    await prisma.wallet.update({
      where: { address },
      data: { lastSeenAt: new Date(now) },
    });
  } catch {
    lastWrite.delete(address);
  }
}

export async function countOnline(
  windowMs = ONLINE_WINDOW_MS,
): Promise<number> {
  return prisma.wallet.count({
    where: { lastSeenAt: { gte: new Date(Date.now() - windowMs) } },
  });
}

export type OnlinePlayer = {
  address: string;
  displayName: string | null;
  lastSeenAt: string | null;
  hypeBalance: string;
  harvestStreak: number;
  flaggedSybil: boolean;
  seasonPoints: string;
};

export async function listOnline(
  {
    windowMs = ONLINE_WINDOW_MS,
    seasonId,
    limit = 200,
  }: { windowMs?: number; seasonId?: string; limit?: number } = {},
): Promise<OnlinePlayer[]> {
  const wallets = await prisma.wallet.findMany({
    where: { lastSeenAt: { gte: new Date(Date.now() - windowMs) } },
    orderBy: { lastSeenAt: "desc" },
    take: Math.min(limit, 500),
    include: {
      seasonPoints: seasonId ? { where: { seasonId }, take: 1 } : false,
    },
  });

  return wallets.map((w) => ({
    address: w.address,
    displayName: w.displayName,
    lastSeenAt: w.lastSeenAt?.toISOString() ?? null,
    hypeBalance: w.hypeBalance.toString(),
    harvestStreak: w.harvestStreak,
    flaggedSybil: w.flaggedSybil,
    seasonPoints: w.seasonPoints?.[0]?.points.toString() ?? "0",
  }));
}
