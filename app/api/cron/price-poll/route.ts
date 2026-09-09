import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { isCronAuthorized } from "@/lib/farm/helpers";
import { fetchFarmPrice } from "@/lib/priceFeed";
import {
  GOLDEN_HARVEST_PRICE_THRESHOLD,
  GOLDEN_HARVEST_WINDOW_MS,
} from "@/lib/game/config";

/**
 * Price poll cron — samples Dexscreener and may trigger Golden Harvest when
 * price rises more than the configured threshold over the rolling window.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let quote;
  try {
    quote = await fetchFarmPrice();
  } catch (err) {
    const message = err instanceof Error ? err.message : "price fetch failed";
    return Response.json({ error: message }, { status: 502 });
  }

  await prisma.priceSample.create({
    data: {
      priceUsd: new Decimal(quote.priceUsd).toFixed(),
      sampledAt: now,
    },
  });

  // Prune samples older than 1 hour to keep the table small.
  const pruneBefore = new Date(now.getTime() - 60 * 60 * 1000);
  await prisma.priceSample.deleteMany({
    where: { sampledAt: { lt: pruneBefore } },
  });

  const windowStart = new Date(now.getTime() - GOLDEN_HARVEST_WINDOW_MS);
  const oldest = await prisma.priceSample.findFirst({
    where: { sampledAt: { gte: windowStart } },
    orderBy: { sampledAt: "asc" },
  });

  let changeFraction = 0;
  if (oldest) {
    const oldPrice = new Decimal(oldest.priceUsd.toString());
    if (oldPrice.gt(0)) {
      changeFraction = new Decimal(quote.priceUsd)
        .minus(oldPrice)
        .div(oldPrice)
        .toNumber();
    }
  }

  const active = await prisma.goldenHarvestEvent.findFirst({
    where: { active: true, endsAt: { gt: now } },
  });

  // Deactivate expired events.
  await prisma.goldenHarvestEvent.updateMany({
    where: { active: true, endsAt: { lte: now } },
    data: { active: false },
  });

  let triggered = false;
  let event = active;

  if (
    !active &&
    changeFraction >= GOLDEN_HARVEST_PRICE_THRESHOLD &&
    oldest
  ) {
    const endsAt = new Date(now.getTime() + GOLDEN_HARVEST_WINDOW_MS);
    event = await prisma.goldenHarvestEvent.create({
      data: {
        startedAt: now,
        endsAt,
        priceChangePct: new Decimal(changeFraction * 100).toFixed(4),
        active: true,
      },
    });
    triggered = true;
  }

  return Response.json({
    ok: true,
    priceUsd: quote.priceUsd,
    source: quote.source,
    changeFraction,
    threshold: GOLDEN_HARVEST_PRICE_THRESHOLD,
    triggered,
    goldenHarvest: event
      ? {
          id: event.id,
          startedAt: event.startedAt.toISOString(),
          endsAt: event.endsAt.toISOString(),
          priceChangePct: event.priceChangePct.toString(),
          active: event.active && event.endsAt > now,
        }
      : null,
  });
}
