import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { SEASON_DURATION_DAYS, STARTER_PLOTS } from "@/lib/game/config";

export function generateReferralCode(): string {
  return randomBytes(5).toString("hex").toUpperCase();
}

export function utcDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Active (open) season covering `now`, or null. */
export async function findActiveSeason(now: Date = new Date()) {
  return prisma.season.findFirst({
    where: {
      startsAt: { lte: now },
      endsAt: { gt: now },
      closedAt: null,
    },
    orderBy: { number: "desc" },
  });
}

/** Ensure Season #1+ exists for the current window (idempotent). */
export async function ensureCurrentSeason(now: Date = new Date()) {
  const existing = await findActiveSeason(now);
  if (existing) return existing;

  const latest = await prisma.season.findFirst({ orderBy: { number: "desc" } });
  const nextNumber = (latest?.number ?? 0) + 1;
  const startsAt = latest && latest.endsAt > now ? latest.endsAt : now;
  const endsAt = new Date(
    startsAt.getTime() + SEASON_DURATION_DAYS * 24 * 60 * 60 * 1000,
  );

  return prisma.season.create({
    data: {
      number: nextNumber,
      startsAt,
      endsAt,
    },
  });
}

export async function ensureSeasonPoint(walletId: string, seasonId: string) {
  return prisma.seasonPoint.upsert({
    where: {
      walletId_seasonId: { walletId, seasonId },
    },
    create: { walletId, seasonId, points: 0 },
    update: {},
  });
}

export async function createStarterPlots(walletId: string) {
  const data = Array.from({ length: STARTER_PLOTS }, (_, index) => ({
    walletId,
    index,
    status: "empty",
  }));
  await prisma.plot.createMany({ data });
}

export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
