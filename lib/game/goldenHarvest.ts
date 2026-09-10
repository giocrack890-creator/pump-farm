import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import {
  GOLDEN_HARVEST_PRICE_THRESHOLD,
  GOLDEN_HARVEST_WINDOW_MS,
} from "@/lib/game/config";

/**
 * Golden Harvest: a pump inside a ten-minute window triples what a harvest pays.
 *
 * The sampling used to be a once-a-day Vercel cron, which cannot detect a
 * ten-minute move by construction — the only sample inside the window was the
 * one the cron had just written, so the change was always exactly zero and the
 * event never fired once.
 *
 * Sampling happens here instead, on the requests players are already making.
 * That puts the sample rate where it belongs: dense while people are playing,
 * idle when nobody is. The cron still calls this so a quiet farm keeps a
 * history, but it is no longer the only thing writing samples.
 */

const SAMPLE_EVERY_MS = 60_000;
const EVENT_DURATION_MS = GOLDEN_HARVEST_WINDOW_MS;
/** Keep an hour: six times the detection window, still a tiny table. */
const RETAIN_MS = 60 * 60_000;

let lastSampleAt = 0;
let pruneDue = 0;

export type GoldenCheck = {
  sampled: boolean;
  priceUsd: number;
  changeFraction: number;
  triggered: boolean;
  activeUntil: string | null;
};

export async function recordPriceAndCheckGolden(
  priceUsd: number,
  { force = false }: { force?: boolean } = {},
): Promise<GoldenCheck> {
  const now = Date.now();
  const idle: GoldenCheck = {
    sampled: false,
    priceUsd,
    changeFraction: 0,
    triggered: false,
    activeUntil: null,
  };

  if (!(priceUsd > 0)) return idle;
  if (!force && now - lastSampleAt < SAMPLE_EVERY_MS) return idle;
  lastSampleAt = now;

  const at = new Date(now);

  try {
    await prisma.priceSample.create({
      data: { priceUsd: new Decimal(priceUsd).toFixed(), sampledAt: at },
    });

    const windowStart = new Date(now - GOLDEN_HARVEST_WINDOW_MS);
    const oldest = await prisma.priceSample.findFirst({
      where: { sampledAt: { gte: windowStart } },
      orderBy: { sampledAt: "asc" },
    });

    let changeFraction = 0;
    if (oldest) {
      const oldPrice = new Decimal(oldest.priceUsd.toString());
      if (oldPrice.gt(0)) {
        changeFraction = new Decimal(priceUsd)
          .minus(oldPrice)
          .div(oldPrice)
          .toNumber();
      }
    }

    const active = await prisma.goldenHarvestEvent.findFirst({
      where: { active: true, endsAt: { gt: at } },
      orderBy: { startedAt: "desc" },
    });

    let triggered = false;
    let activeUntil = active?.endsAt.toISOString() ?? null;

    if (!active && changeFraction >= GOLDEN_HARVEST_PRICE_THRESHOLD) {
      const event = await prisma.goldenHarvestEvent.create({
        data: {
          startedAt: at,
          endsAt: new Date(now + EVENT_DURATION_MS),
          priceChangePct: new Decimal(changeFraction).toDecimalPlaces(6).toFixed(),
          active: true,
        },
      });
      triggered = true;
      activeUntil = event.endsAt.toISOString();
    }

    // Retire expired events so `active: true` means what it says.
    await prisma.goldenHarvestEvent.updateMany({
      where: { active: true, endsAt: { lte: at } },
      data: { active: false },
    });

    if (now > pruneDue) {
      pruneDue = now + 10 * 60_000;
      await prisma.priceSample.deleteMany({
        where: { sampledAt: { lt: new Date(now - RETAIN_MS) } },
      });
    }

    return { sampled: true, priceUsd, changeFraction, triggered, activeUntil };
  } catch {
    // Sampling is best-effort: never fail a farm read over it.
    lastSampleAt = 0;
    return idle;
  }
}
