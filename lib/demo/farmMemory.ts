/**
 * In-memory farm for localhost when DATABASE_URL is missing / placeholder.
 */

import { randomBytes } from "crypto";
import { soilCells } from "@/game/farmLayout";
import { STARTER_PLOTS, DAILY_HYPE_ALLOWANCE } from "@/lib/game/config";
import {
  getPlotStatus,
  computeHarvestPoints,
  isHarvestable,
} from "@/lib/game/growth";
import { nextStreak, streakMultiplier, utcDayKey } from "@/lib/game/hype";
import { SEED_DEFS, type SeedTierId } from "@/lib/game/seeds";
import { XP_REWARDS, levelFromXp } from "@/lib/game/xp";
import {
  activityMultiplier,
  computeIdleHype,
  farmerHypePerSec,
  fieldSpotsForLevel,
  FARMER_SPECIES,
  harvestBoostFromFarmers,
  hireCost,
  pickScoutSpecies,
  promoteCost,
  SCOUT_COOLDOWN_MS,
  type FarmerSpeciesId,
  type OwnedFarmer,
} from "@/lib/game/farmers";
import {
  DECOR_ITEMS,
  DECOR_SLOTS,
  type DecorItemId,
  type DecorPlacement,
} from "@/lib/game/decor";

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
  hasCompletedTutorial: boolean;
  farmers: OwnedFarmer[];
  scoutReadyAt: number;
  pendingScout: FarmerSpeciesId | null;
  farmersLastClaimAt: string | null;
  decor: DecorPlacement[];
};

const g = globalThis as unknown as { __pumpFarmDemoStardew?: DemoWallet };

function freshPlots(size = 3): DemoPlot[] {
  const soils = soilCells();
  const plots: DemoPlot[] = [];
  let index = 0;
  // Prefer hand-authored soil cells; fall back to size×size grid
  if (soils.length >= size * size) {
    for (let i = 0; i < size * size; i++) {
      const cell = soils[i]!;
      plots.push({
        id: `demo-plot-${index}`,
        index,
        gridX: cell.gridX,
        gridY: cell.gridY,
        seedTier: null,
        plantedAt: null,
        maturesAt: null,
        harvestedAt: null,
        status: "empty",
      });
      index += 1;
    }
    return plots;
  }
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
  if (!g.__pumpFarmDemoStardew) {
    g.__pumpFarmDemoStardew = {
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
      hasCompletedTutorial: false,
      farmers: [],
      scoutReadyAt: 0,
      pendingScout: null,
      farmersLastClaimAt: new Date().toISOString(),
      decor: [],
    };
  }
  // migrate older demo sessions
  const w = g.__pumpFarmDemoStardew;
  if (!w.farmers) w.farmers = [];
  if (w.scoutReadyAt == null) w.scoutReadyAt = 0;
  if (w.pendingScout === undefined) w.pendingScout = null;
  if (!w.farmersLastClaimAt) w.farmersLastClaimAt = new Date().toISOString();
  if (!w.decor) w.decor = [];
  return w;
}

export function demoFarmSnapshot() {
  const w = getDemoWallet();
  const now = new Date();
  const plots = w.plots.map((p) => ({ ...p, status: getPlotStatus(p, now) }));
  const endsAt = new Date(now.getTime() + 7 * 86400000);
  const farmLevel = levelFromXp(w.xp);
  const pendingIdle = computeIdleHype(w.farmers, w.farmersLastClaimAt, now.getTime());
  return {
    wallet: {
      address: w.address,
      hypeBalance: String(w.hypeBalance),
      harvestStreak: w.harvestStreak,
      referralCode: w.referralCode,
      xp: w.xp,
      gridSize: w.gridSize,
      hasCompletedTutorial: w.hasCompletedTutorial,
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
    multipliers: {
      stake: 1,
      streak: streakMultiplier(w.harvestStreak),
      golden: 1,
      activity: activityMultiplier(w.farmers),
      farmerHarvestBoost: harvestBoostFromFarmers(w.farmers),
    },
    farmers: {
      roster: w.farmers,
      spots: fieldSpotsForLevel(farmLevel),
      deployed: w.farmers.filter((f) => f.deployed).length,
      hypePerSec: w.farmers
        .filter((f) => f.deployed)
        .reduce((a, f) => a + farmerHypePerSec(f), 0),
      pendingIdleHype: pendingIdle,
      scoutReadyAt: w.scoutReadyAt,
      pendingScout: w.pendingScout
        ? { speciesId: w.pendingScout, ...FARMER_SPECIES[w.pendingScout] }
        : null,
      activity: activityMultiplier(w.farmers),
    },
    decor: w.decor,
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
  const farmerBoost = 1 + harvestBoostFromFarmers(w.farmers);
  const awarded = Math.round(points * farmerBoost * 100) / 100;
  const xpGain =
    key === "Mythic"
      ? XP_REWARDS.harvestMythic
      : key === "Golden"
        ? XP_REWARDS.harvestGolden
        : key === "Hybrid"
          ? XP_REWARDS.harvestHybrid
          : XP_REWARDS.harvestBasic;
  w.seasonPoints += awarded;
  w.xp += xpGain;
  w.harvestStreak = streak;
  w.lastHarvestDay = today;
  plot.seedTier = null;
  plot.plantedAt = null;
  plot.maturesAt = null;
  plot.harvestedAt = now.toISOString();
  plot.status = "empty";
  return {
    awarded,
    xpGained: xpGain,
    xp: w.xp,
    seasonPoints: String(w.seasonPoints),
    streak,
    blighted: status === "blighted",
    farmerBoost,
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

/** Tutorial-only: force one growing crop ready. Rejected after tutorial unless replay. */
export function demoTutorialInstantGrow(plotId: string, replay = false) {
  const w = getDemoWallet();
  if (w.hasCompletedTutorial && !replay) {
    throw new Error("Tutorial instant-grow is not available after tutorial completion");
  }
  const plot = w.plots.find((p) => p.id === plotId);
  if (!plot?.plantedAt) throw new Error("No growing crop on that plot");
  plot.maturesAt = new Date(Date.now() - 1000).toISOString();
  plot.status = "ready";
  return {
    plot: { ...plot, status: getPlotStatus(plot) },
  };
}

export function demoCompleteTutorial() {
  const w = getDemoWallet();
  w.hasCompletedTutorial = true;
  return { hasCompletedTutorial: true };
}

export function demoScoutFarmer() {
  const w = getDemoWallet();
  const now = Date.now();
  if (now < w.scoutReadyAt) {
    throw new Error(`Scout cooling down — ${Math.ceil((w.scoutReadyAt - now) / 1000)}s`);
  }
  const farmLevel = levelFromXp(w.xp);
  const speciesId = pickScoutSpecies(farmLevel);
  w.pendingScout = speciesId;
  w.scoutReadyAt = now + SCOUT_COOLDOWN_MS;
  return {
    pendingScout: { speciesId, ...FARMER_SPECIES[speciesId] },
    scoutReadyAt: w.scoutReadyAt,
  };
}

export function demoHirePendingFarmer() {
  const w = getDemoWallet();
  if (!w.pendingScout) throw new Error("No scouted farmer waiting — Scout first");
  const species = FARMER_SPECIES[w.pendingScout];
  const cost = hireCost(species.rarity, w.farmers.length);
  if (w.hypeBalance < cost) throw new Error(`Need ${cost} Hype to hire`);
  w.hypeBalance -= cost;
  const farmer: OwnedFarmer = {
    id: `farmer-${randomBytes(4).toString("hex")}`,
    speciesId: w.pendingScout,
    level: 1,
    deployed: false,
    hiredAt: new Date().toISOString(),
  };
  w.farmers.push(farmer);
  w.pendingScout = null;
  return { farmer, hypeBalance: String(w.hypeBalance), roster: w.farmers };
}

export function demoDismissPendingScout() {
  const w = getDemoWallet();
  w.pendingScout = null;
  return { ok: true };
}

export function demoDeployFarmer(farmerId: string, deploy: boolean) {
  const w = getDemoWallet();
  const f = w.farmers.find((x) => x.id === farmerId);
  if (!f) throw new Error("Farmer not found");
  const farmLevel = levelFromXp(w.xp);
  const spots = fieldSpotsForLevel(farmLevel);
  if (deploy) {
    const deployed = w.farmers.filter((x) => x.deployed).length;
    if (!f.deployed && deployed >= spots) {
      throw new Error(`All ${spots} field spots full — bench someone`);
    }
    f.deployed = true;
  } else {
    f.deployed = false;
  }
  return { farmer: f, roster: w.farmers, spots };
}

export function demoPromoteFarmer(farmerId: string) {
  const w = getDemoWallet();
  const f = w.farmers.find((x) => x.id === farmerId);
  if (!f) throw new Error("Farmer not found");
  if (f.level >= 10) throw new Error("Max farmer level");
  const cost = promoteCost(f.level);
  if (w.hypeBalance < cost) throw new Error(`Need ${cost} Hype to promote`);
  w.hypeBalance -= cost;
  f.level += 1;
  return { farmer: f, hypeBalance: String(w.hypeBalance) };
}

export function demoClaimFarmerIdle() {
  const w = getDemoWallet();
  const gained = computeIdleHype(w.farmers, w.farmersLastClaimAt);
  w.hypeBalance += gained;
  w.farmersLastClaimAt = new Date().toISOString();
  return {
    awarded: gained,
    hypeBalance: String(w.hypeBalance),
    hypePerSec: w.farmers
      .filter((f) => f.deployed)
      .reduce((a, f) => a + farmerHypePerSec(f), 0),
  };
}

export function demoPlaceDecor(itemId: string) {
  const w = getDemoWallet();
  const item = DECOR_ITEMS[itemId as DecorItemId];
  if (!item) throw new Error("Unknown decor item");
  const farmLevel = levelFromXp(w.xp);
  if (farmLevel < item.unlockLevel) {
    throw new Error(`Requires Farm Level ${item.unlockLevel}`);
  }
  if (w.decor.some((d) => d.itemId === item.id)) {
    throw new Error("Already placed on your farm");
  }
  if (w.hypeBalance < item.hypeCost) throw new Error(`Need ${item.hypeCost} Hype`);
  const used = new Set(w.decor.map((d) => `${d.gridX},${d.gridY}`));
  const slot = DECOR_SLOTS.find((s) => !used.has(`${s.gridX},${s.gridY}`));
  if (!slot) throw new Error("No free decor slots — expand land later");
  w.hypeBalance -= item.hypeCost;
  const placed: DecorPlacement = {
    id: `decor-${randomBytes(3).toString("hex")}`,
    itemId: item.id,
    gridX: slot.gridX,
    gridY: slot.gridY,
  };
  w.decor.push(placed);
  return { placement: placed, decor: w.decor, hypeBalance: String(w.hypeBalance) };
}

void STARTER_PLOTS;
