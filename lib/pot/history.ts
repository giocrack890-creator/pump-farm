import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPotSnapshot } from "@/lib/pot/snapshot";

/**
 * A trail of what the pot has been.
 *
 * The proof page used to draw a seven-day chart from a hardcoded array that
 * climbed to 42.5 ETH, labelled "illustrative". On a page whose whole purpose
 * is showing people the money is real, an invented line is the worst possible
 * decoration — so the chart is now drawn from these rows, and shows nothing
 * until there are some.
 *
 * Written on player traffic rather than a cron: Vercel's free tier runs one
 * cron a day, which is not a chart.
 */

const WRITE_EVERY_MS = 10 * 60_000;
let lastWrite = 0;

export async function recordFeeSnapshot(): Promise<void> {
  const now = Date.now();
  if (now - lastWrite < WRITE_EVERY_MS) return;
  lastWrite = now;

  try {
    const pot = await getPotSnapshot();
    // Only a confirmed reading belongs in the history.
    if (!pot.ok || !pot.token) return;

    await prisma.feeSnapshot.create({
      data: {
        token: pot.token,
        creator: pot.creator,
        claimableWei: toWei(pot.claimableEth),
        pendingWei: toWei(pot.pendingEth),
        treasuryWei: toWei(pot.treasuryEth),
        ethUsd: new Prisma.Decimal(pot.ethUsd || 0),
        potEth: new Prisma.Decimal(pot.potEth),
        potUsd: new Prisma.Decimal(pot.potUsd ?? 0),
        venue: pot.venue,
      },
    });
  } catch {
    // History is a nice-to-have; never fail a request over it.
    lastWrite = 0;
  }
}

function toWei(eth: number): string {
  if (!Number.isFinite(eth) || eth <= 0) return "0";
  return BigInt(Math.round(eth * 1e18)).toString();
}

export type FeeHistoryPoint = { at: string; potEth: number; potUsd: number };

/** Daily high-water points for the pot chart. Empty until there is history. */
export async function feeHistory(days = 7): Promise<FeeHistoryPoint[]> {
  const since = new Date(Date.now() - days * 86_400_000);

  const rows = await prisma.feeSnapshot
    .findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, potEth: true, potUsd: true },
    })
    .catch(() => []);

  const byDay = new Map<string, FeeHistoryPoint>();
  for (const row of rows) {
    const day = row.createdAt.toISOString().slice(0, 10);
    // The last reading of each day: the pot only grows, so it is the day's total.
    byDay.set(day, {
      at: day,
      potEth: Number(row.potEth),
      potUsd: Number(row.potUsd),
    });
  }

  return [...byDay.values()];
}
