import { prisma } from "@/lib/prisma";
import { GOLDEN_HARVEST_MULTIPLIER } from "@/lib/game/config";

export async function GET() {
  const now = new Date();

  await prisma.goldenHarvestEvent.updateMany({
    where: { active: true, endsAt: { lte: now } },
    data: { active: false },
  });

  const event = await prisma.goldenHarvestEvent.findFirst({
    where: { active: true, endsAt: { gt: now } },
    orderBy: { startedAt: "desc" },
  });

  if (!event) {
    return Response.json({
      active: false,
      multiplier: 1,
      event: null,
    });
  }

  return Response.json({
    active: true,
    multiplier: GOLDEN_HARVEST_MULTIPLIER,
    event: {
      id: event.id,
      startedAt: event.startedAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      priceChangePct: event.priceChangePct.toString(),
      msRemaining: Math.max(0, event.endsAt.getTime() - now.getTime()),
    },
  });
}
