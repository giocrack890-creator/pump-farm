import { prisma } from "@/lib/prisma";
import { SEASON_DURATION_DAYS } from "@/lib/game/config";

export async function getOrCreateActiveSeason() {
  const now = new Date();
  const active = await prisma.season.findFirst({
    where: { startsAt: { lte: now }, endsAt: { gt: now }, closedAt: null },
    orderBy: { number: "desc" },
  });
  if (active) return active;

  const last = await prisma.season.findFirst({ orderBy: { number: "desc" } });
  const number = (last?.number ?? 0) + 1;
  const startsAt = now;
  const endsAt = new Date(now.getTime() + SEASON_DURATION_DAYS * 24 * 60 * 60 * 1000);
  return prisma.season.create({
    data: { number, startsAt, endsAt },
  });
}
