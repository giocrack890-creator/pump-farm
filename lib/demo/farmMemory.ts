/**
 * In-memory farm for localhost when DATABASE_URL is missing / placeholder.
 */

import { randomBytes } from "crypto";
import { STARTER_PLOTS, DAILY_HYPE_ALLOWANCE } from "@/lib/game/config";
import {
  getPlotStatus,
  computeHarvestPoints,
  isHarvestable,
} from "@/lib/game/growth";
import { nextStreak, streakMultiplier, utcDayKey } from "@/lib/game/hype";
import { SEED_DEFS, type SeedTierId } from "@/lib/game/seeds";
import { XP_REWARDS } from "@/lib/game/xp";

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

export type DemoPlot = {
  id: string;
  index: number;
  gridX: number;
  gridY: number;
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
  xp: number;
  gridSize: number;
};

const g = globalThis as unknown as { __pumpFarmDemo?: DemoWallet };

function freshPlots(size = 3): DemoPlot[] {
  const plots: DemoPlot[] = [];
  let index = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      plots.push({
        id: `demo-plot-${index}`,
        index,
        gridX: x,
        gridY: y,
        seedTier: null,
        plantedAt: null,
        maturesAt: null,
        harvestedAt: null,
        status: "empty",
      });
      index += 1;
    }
  }
  return plots;
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
      plots: freshPlots(3),
      seasonPoints: 0,
      xp: 0,
      gridSize: 3,
    };
  }
  return g.__pumpFarmDemo;
}

export function demoFarmSnapshot() {
  const w = getDemoWallet();
  const now = new Date();
  const plots = w.plots.map((p) => ({ ...p, status: getPlotStatus(p, now) }));
  const endsAt = new Date(now.getTime() + 7 * 86400000);
  return {
    wallet: {
      address: w.address,
      hypeBalance: String(w.hypeBalance),
      harvestStreak: w.harvestStreak,
      referralCode: w.referralCode,
      xp: w.xp,
      gridSize: w.gridSize,
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
  const key = (Object.keys(SEED_DEFS) as SeedTierId[]).find(
    (k) => k.toLowerCase() === seedTier.toLowerCase(),
  );
  if (!key) throw new Error("Invalid seed tier");
  const tier = SEED_DEFS[key];
  const plot = w.plots.find((p) => p.id === plotId);
  if (!plot) throw new Error("Plot not found");
  if (getPlotStatus(plot) !== "empty") throw new Error("Plot is not empty");
  if (w.hypeBalance < tier.hypeCost) throw new Error("Not enough Hype");

  const plantedAt = new Date();
  const maturesAt = new Date(plantedAt.getTime() + tier.demoGrowMs);
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
  const key = (Object.keys(SEED_DEFS) as SeedTierId[]).find(
    (k) => k.toLowerCase() === (plot.seedTier ?? "").toLowerCase(),
  );
  if (!key) throw new Error("Invalid crop");
  const tier = SEED_DEFS[key];
  const status = getPlotStatus(plot, now);
  const today = utcDayKey(now);
  const streak = nextStreak(w.lastHarvestDay, today, w.harvestStreak);
  const points = computeHarvestPoints({
    baseYield: tier.baseYieldSp,
    streakMult: streakMultiplier(streak),
    goldenMult: 1,
    blighted: status === "blighted",
  });
  const xpGain =
    key === "Mythic"
      ? XP_REWARDS.harvestMythic
      : key === "Golden"
        ? XP_REWARDS.harvestGolden
        : key === "Hybrid"
          ? XP_REWARDS.harvestHybrid
          : XP_REWARDS.harvestBasic;
  w.seasonPoints += points;
  w.xp += xpGain;
  w.harvestStreak = streak;
  w.lastHarvestDay = today;
  plot.seedTier = null;
  plot.plantedAt = null;
  plot.maturesAt = null;
  plot.harvestedAt = now.toISOString();
  plot.status = "empty";
  return {
    awarded: points,
    xpGained: xpGain,
    xp: w.xp,
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

export function demoExpand() {
  const w = getDemoWallet();
  if (w.gridSize >= 5) throw new Error("Max land size reached");
  if (w.hypeBalance < 80) throw new Error("Need 80 Hype to expand");
  const next = w.gridSize + 1;
  const byCell = new Map(w.plots.map((p) => [`${p.gridX},${p.gridY}`, p]));
  const plots: DemoPlot[] = [];
  let index = 0;
  for (let y = 0; y < next; y++) {
    for (let x = 0; x < next; x++) {
      const prev = byCell.get(`${x},${y}`);
      if (prev) {
        plots.push({ ...prev, index });
      } else {
        plots.push({
          id: `demo-plot-${next}-${index}`,
          index,
          gridX: x,
          gridY: y,
          seedTier: null,
          plantedAt: null,
          maturesAt: null,
          harvestedAt: null,
          status: "empty",
        });
      }
      index += 1;
    }
  }
  w.gridSize = next;
  w.plots = plots;
  w.hypeBalance -= 80;
  return { gridSize: next, plots: w.plots, hypeBalance: String(w.hypeBalance) };
}

void STARTER_PLOTS;
