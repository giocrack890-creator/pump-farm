import { ensureCurrentSeason, findActiveSeason } from "@/lib/farm/helpers";

export async function GET() {
  const now = new Date();
  const season = (await findActiveSeason(now)) ?? (await ensureCurrentSeason(now));
  const msRemaining = Math.max(0, season.endsAt.getTime() - now.getTime());

  return Response.json({
    id: season.id,
    number: season.number,
    startsAt: season.startsAt.toISOString(),
    endsAt: season.endsAt.toISOString(),
    closedAt: season.closedAt?.toISOString() ?? null,
    poolAmount: season.poolAmount?.toString() ?? null,
    msRemaining,
    countdown: {
      days: Math.floor(msRemaining / (24 * 60 * 60 * 1000)),
      hours: Math.floor((msRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)),
      minutes: Math.floor((msRemaining % (60 * 60 * 1000)) / (60 * 1000)),
      seconds: Math.floor((msRemaining % (60 * 1000)) / 1000),
    },
  });
}
