/**
 * In-memory farm for localhost when DATABASE_URL is missing / placeholder.
 * Lets you play without Supabase credentials.
 */

import { randomBytes } from "crypto";
import {
  STARTER_PLOTS,
  DAILY_HYPE_ALLOWANCE,
} from "@/lib/game/config";
import {
  getPlotStatus,
  computeHarvestPoints,
  getSeedTier,
  isHarvestable,
} from "@/lib/game/growth";
import { nextStreak, streakMultiplier, utcDayKey } from "@/lib/game/hype";

export const DEMO_ADDRESS = "0x0000000000000000000000000000000000faded1";

export function isDemoDbMode(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return (
    process.env.DEMO_MODE === "true" ||
    !url ||
    url.includes("REPLACE_ME") ||
    url.includes("[YOUR-PASSWORD]")
  );
}

type DemoPlot = {
  id: string;
  index: number;
  seedTier: string | null;
  plantedAt: string | null;
  maturesAt: string | null;
  harvestedAt: string | null;
  status: string;
};

type DemoWallet = {
  address: string;
  hypeBalance: number;
  harvestStreak: number;
  lastHarvestDay: string | null;
  lastDailyHypeAt: string | null;
  referralCode: string;
  plots: DemoPlot[];
  seasonPoints: number;
};

const g = globalThis as unknown as { __pumpFarmDemo?: DemoWallet };

function freshPlots(): DemoPlot[] {
  return Array.from({ length: STARTER_PLOTS }, (_, index) => ({
    id: `demo-plot-${index}`,
    index,
    seedTier: null,
    plantedAt: null,
    maturesAt: null,
    harvestedAt: null,
    status: "empty",
  }));
}

export function getDemoWallet(): DemoWallet {
  if (!g.__pumpFarmDemo) {
    g.__pumpFarmDemo = {
      address: DEMO_ADDRESS,
      hypeBalance: 500,
      harvestStreak: 0,
      lastHarvestDay: null,
      lastDailyHypeAt: null,
      referralCode: randomBytes(4).toString("hex"),
      plots: freshPlots(),
      seasonPoints: 0,
    };
  }
  return g.__pumpFarmDemo;
}

export function demoFarmSnapshot() {
  const w = getDemoWallet();
  const now = new Date();
  const plots = w.plots.map((p) => {
    const status = getPlotStatus(p, now);
    return { ...p, status };
  });
  const endsAt = new Date(now.getTime() + 7 * 86400000);
  return {
    wallet: {
      address: w.address,
      hypeBalance: String(w.hypeBalance),
      harvestStreak: w.harvestStreak,
      referralCode: w.referralCode,
    },
    season: {
      id: "demo-season",
      number: 1,
      startsAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      msRemaining: endsAt.getTime() - now.getTime(),
    },
    seasonPoints: String(w.seasonPoints),
    plots,
    multipliers: { stake: 1, streak: streakMultiplier(w.harvestStreak), golden: 1 },
    goldenHarvest: null,
    weather: "Sunny",
    demo: true,
  };
}

export function demoPlant(plotId: string, seedTier: string) {
  const w = getDemoWallet();
  const tier = getSeedTier(seedTier);
  if (!tier) throw new Error("Invalid seed tier");
  const plot = w.plots.find((p) => p.id === plotId);
  if (!plot) throw new Error("Plot not found");
  if (getPlotStatus(plot) !== "empty") throw new Error("Plot is not empty");
  if (w.hypeBalance < tier.hypeCost) throw new Error("Not enough Hype");

  const plantedAt = new Date();
  // Demo: grow in 30s so the loop is testable immediately
  const maturesAt = new Date(plantedAt.getTime() + 30_000);
  w.hypeBalance -= tier.hypeCost;
  plot.seedTier = tier.id;
  plot.plantedAt = plantedAt.toISOString();
  plot.maturesAt = maturesAt.toISOString();
  plot.status = "growing";
  return { plot: { ...plot, status: "growing" }, hypeBalance: String(w.hypeBalance) };
}

export function demoHarvest(plotId: string) {
  const w = getDemoWallet();
  const plot = w.plots.find((p) => p.id === plotId);
  if (!plot) throw new Error("Plot not found");
  const now = new Date();
  if (!isHarvestable(plot, now)) throw new Error("Crop not ready");
  const tier = getSeedTier(plot.seedTier ?? "");
  if (!tier) throw new Error("Invalid crop");
  const status = getPlotStatus(plot, now);
  const today = utcDayKey(now);
  const streak = nextStreak(w.lastHarvestDay, today, w.harvestStreak);
  const points = computeHarvestPoints({
    baseYield: tier.baseYieldSp,
    streakMult: streakMultiplier(streak),
    goldenMult: 1,
    blighted: status === "blighted",
  });
  w.seasonPoints += points;
  w.harvestStreak = streak;
  w.lastHarvestDay = today;
  plot.seedTier = null;
  plot.plantedAt = null;
  plot.maturesAt = null;
  plot.harvestedAt = now.toISOString();
  plot.status = "empty";
  return {
    awarded: points,
    seasonPoints: String(w.seasonPoints),
    streak,
    blighted: status === "blighted",
  };
}

export function demoClaimDaily() {
  const w = getDemoWallet();
  const today = utcDayKey();
  if (w.lastDailyHypeAt?.slice(0, 10) === today) {
    throw new Error("Already claimed today");
  }
  w.hypeBalance += DAILY_HYPE_ALLOWANCE;
  w.lastDailyHypeAt = new Date().toISOString();
  return { awarded: DAILY_HYPE_ALLOWANCE, hypeBalance: String(w.hypeBalance) };
}
