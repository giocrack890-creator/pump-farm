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
  MAX_FIELD_SPOTS_CAP,
  pickScoutSpecies,
  promoteCost,
  SCOUT_COOLDOWN_MS,
  type FarmerSpeciesId,
  type OwnedFarmer,
} from "@/lib/game/farmers";
import {
  cappedOfflineWindow,
  coverageUpgradeBonus,
  automatedPlotCount,
  planWorkerAutoHarvests,
  WORKER_SWEEP_MS,
} from "@/lib/game/autoHarvest";
import {
  DECOR_ITEMS,
  DECOR_SLOTS,
  type DecorItemId,
  type DecorPlacement,
} from "@/lib/game/decor";
import {
  ANIMAL_SPECIES,
  animalHypePerSec,
  computeAnimalIdleHype,
  type AnimalSpeciesId,
  type OwnedAnimal,
} from "@/lib/game/animals";
import {
  autoYieldMult,
  bonusFieldSpots,
  DEFAULT_WORKER_UPGRADES,
  sweepIntervalMult,
  WORKER_UPGRADES,
  type WorkerUpgradeId,
  type WorkerUpgradeLevels,
} from "@/lib/game/workerUpgrades";
import {
  DEMO_ADDRESS,
  type DemoPlot,
  type DemoWallet,
} from "@/lib/demo/farmMemoryTypes";
import {
  normalizeDemoWallet,
  readDemoDisk,
  writeDemoDisk,
} from "@/lib/demo/demoPersist";
import { demoSaveScore } from "@/lib/demo/demoSaveScore";

export { DEMO_ADDRESS, type DemoPlot, type DemoWallet } from "@/lib/demo/farmMemoryTypes";
export { DEMO_SAVE_KEY } from "@/lib/demo/demoPersist";

export function isDemoDbMode(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return (
    process.env.DEMO_MODE === "true" ||
    !url ||
    url.includes("REPLACE_ME") ||
    url.includes("[YOUR-PASSWORD]")
  );
}

const g = globalThis as unknown as { __pumpFarmDemoV15?: DemoWallet };

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

function freshWallet(): DemoWallet {
  return {
    address: DEMO_ADDRESS,
    displayName: null,
    hypeBalance: 0,
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
    ownedAnimals: [],
    animalIdleClaimAt: new Date().toISOString(),
    decor: [],
    lastSeenAt: new Date().toISOString(),
    pendingOfflineSummary: null,
    workerUpgrades: { ...DEFAULT_WORKER_UPGRADES },
    autoSeedTier: "Basic",
  };
}

export function persistDemoWallet(): void {
  if (g.__pumpFarmDemoV15) writeDemoDisk(g.__pumpFarmDemoV15);
}

export function exportDemoSave(): DemoWallet {
  return structuredClone(getDemoWallet());
}

/** Restore from browser localStorage — survives Vercel cold starts. */
export function hydrateDemoWallet(raw: unknown): boolean {
  const w = normalizeDemoWallet(raw);
  if (!w) return false;
  const current = g.__pumpFarmDemoV15;
  // Never let a stale local snapshot undo a plant/hire/harvest already on this instance
  if (current && demoSaveScore(w) + 1 < demoSaveScore(current)) {
    return true;
  }
  g.__pumpFarmDemoV15 = w;
  writeDemoDisk(w);
  return true;
}

export function getDemoWallet(): DemoWallet {
  if (!g.__pumpFarmDemoV15) {
    g.__pumpFarmDemoV15 = readDemoDisk() ?? freshWallet();
  }
  const w = g.__pumpFarmDemoV15;
  if (!w.farmers) w.farmers = [];
  if (w.scoutReadyAt == null) w.scoutReadyAt = 0;
  if (w.pendingScout === undefined) w.pendingScout = null;
  if (!w.farmersLastClaimAt) w.farmersLastClaimAt = new Date().toISOString();
  if (!w.ownedAnimals) w.ownedAnimals = [];
  if (!w.animalIdleClaimAt) w.animalIdleClaimAt = new Date().toISOString();
  if (!w.decor) w.decor = [];
  if (w.lastSeenAt === undefined) w.lastSeenAt = new Date().toISOString();
  if (w.pendingOfflineSummary === undefined) w.pendingOfflineSummary = null;
  if (!w.workerUpgrades) w.workerUpgrades = { ...DEFAULT_WORKER_UPGRADES };
  if (!w.autoSeedTier || !(w.autoSeedTier in SEED_DEFS)) w.autoSeedTier = "Basic";
  if (w.displayName === undefined) w.displayName = null;
  return w;
}

function workerHypePerSec(w: DemoWallet): number {
  return w.farmers.filter((f) => f.deployed).reduce((a, f) => a + farmerHypePerSec(f), 0);
}

function totalIdleHypePerSec(w: DemoWallet): number {
  return workerHypePerSec(w) + animalHypePerSec(w.ownedAnimals);
}

function effectiveSpots(w: DemoWallet): number {
  const farmLevel = levelFromXp(w.xp);
  // Cap at 5 — hire many types, choose up to 5 on the field via Deploy/Bench
  return Math.min(
    MAX_FIELD_SPOTS_CAP,
    fieldSpotsForLevel(farmLevel) + bonusFieldSpots(w.workerUpgrades.worker_slots),
  );
}

/** Apply deployed workers' auto plant+harvest sweeps (server-side, capped offline). */
export function applyWorkerAutoHarvests(nowMs = Date.now()): {
  crops: number;
  planted: number;
  sp: number;
  capped: boolean;
  /** True only after a real absence — not while the client is polling. */
  welcome: boolean;
} {
  const w = getDemoWallet();
  const prevSeenMs = w.lastSeenAt ? new Date(w.lastSeenAt).getTime() : nowMs;
  const awayMs = Math.max(0, nowMs - prevSeenMs);
  /** Ignore short gaps from the 4s play poll — welcome only after real leave. */
  const WELCOME_AWAY_MS = 90_000;
  const { fromMs, toMs, capped } = cappedOfflineWindow(w.lastSeenAt, nowMs);
  const upgradeBonus = coverageUpgradeBonus(w.workerUpgrades);
  const seedTier = w.autoSeedTier in SEED_DEFS ? w.autoSeedTier : ("Basic" as SeedTierId);
  const seedDef = SEED_DEFS[seedTier];
  const workers = w.farmers.map((f) => {
    const rarity = FARMER_SPECIES[f.speciesId].rarity;
    const base = WORKER_SWEEP_MS[rarity] ?? WORKER_SWEEP_MS.common;
    return {
      id: f.id,
      rarity,
      deployed: f.deployed,
      level: f.level,
      lastAutoHarvestAt: f.lastAutoHarvestAt ?? null,
      intervalMs: Math.round(base * sweepIntervalMult(w.workerUpgrades.sweep_speed)),
    };
  });
  const events = planWorkerAutoHarvests({
    plots: w.plots,
    workers,
    fromMs,
    toMs,
    autoSeedTier: seedTier,
    seedCost: seedDef.hypeCost,
    growMs: seedDef.demoGrowMs,
    hypeBalance: w.hypeBalance,
    upgradeBonus,
  });

  let spGain = 0;
  let planted = 0;
  const harvestedIds = new Set<string>();
  const yieldMult = autoYieldMult(w.workerUpgrades.yield_bonus);
  for (const ev of events) {
    const plot = w.plots.find((p) => p.id === ev.plotId);
    if (!plot) continue;
    const farmer = w.farmers.find((f) => f.id === ev.workerId);

    if (ev.type === "plant") {
      const tier = (ev.seedTier ?? seedTier) as SeedTierId;
      const def = SEED_DEFS[tier];
      if (!def) continue;
      if (getPlotStatus(plot, new Date(ev.atMs)) !== "empty" && plot.seedTier) continue;
      if (w.hypeBalance < def.hypeCost) continue;
      w.hypeBalance -= def.hypeCost;
      plot.seedTier = def.id;
      plot.plantedAt = new Date(ev.atMs).toISOString();
      plot.maturesAt = new Date(ev.atMs + def.demoGrowMs).toISOString();
      plot.status = "growing";
      planted += 1;
      if (farmer) farmer.lastAutoHarvestAt = new Date(ev.atMs).toISOString();
      continue;
    }

    if (harvestedIds.has(ev.plotId)) continue;
    if (!plot.seedTier || !plot.maturesAt) continue;
    if (new Date(plot.maturesAt).getTime() > ev.atMs) continue;
    const tier = plot.seedTier as SeedTierId;
    const def = SEED_DEFS[tier];
    if (!def) continue;
    const points = computeHarvestPoints({
      baseYield: def.baseYieldSp,
      streakMult: streakMultiplier(w.harvestStreak),
      goldenMult: 1,
      blighted: false,
    });
    const farmerBoost = 1 + harvestBoostFromFarmers(w.farmers);
    const n = Math.round(points * farmerBoost * yieldMult * 100) / 100;
    spGain += n;
    w.seasonPoints += n;
    const xpGain =
      tier === "Mythic"
        ? XP_REWARDS.harvestMythic
        : tier === "Golden"
          ? XP_REWARDS.harvestGolden
          : tier === "Hybrid"
            ? XP_REWARDS.harvestHybrid
            : XP_REWARDS.harvestBasic;
    w.xp += xpGain;
    w.hypeBalance +=
      tier === "Mythic" ? 18 : tier === "Golden" ? 10 : tier === "Hybrid" ? 5 : 3;
    plot.seedTier = null;
    plot.plantedAt = null;
    plot.maturesAt = null;
    plot.harvestedAt = new Date(ev.atMs).toISOString();
    plot.status = "empty";
    harvestedIds.add(ev.plotId);
    if (farmer) farmer.lastAutoHarvestAt = new Date(ev.atMs).toISOString();
  }

  w.lastSeenAt = new Date(nowMs).toISOString();
  const summary = {
    crops: harvestedIds.size,
    planted,
    sp: spGain,
    capped,
    welcome: (harvestedIds.size > 0 || planted > 0) && awayMs >= WELCOME_AWAY_MS,
  };
  if (summary.welcome) {
    w.pendingOfflineSummary = {
      crops: harvestedIds.size,
      sp: spGain,
      capped,
    };
  }
  return summary;
}

export function consumeOfflineSummary() {
  const w = getDemoWallet();
  const s = w.pendingOfflineSummary;
  w.pendingOfflineSummary = null;
  return s;
}

function farmersPanelFromWallet(
  w: DemoWallet,
  opts?: { pendingIdle?: number; offline?: DemoWallet["pendingOfflineSummary"] },
) {
  const covBonus = coverageUpgradeBonus(w.workerUpgrades);
  const coverageAutomated = automatedPlotCount(
    w.plots.length,
    w.farmers.map((f) => ({ level: f.level, deployed: f.deployed })),
    covBonus,
  );
  const pendingIdle =
    opts?.pendingIdle ??
    Math.floor(
      (computeIdleHype(w.farmers, w.farmersLastClaimAt) +
        computeAnimalIdleHype(w.ownedAnimals, w.animalIdleClaimAt)) *
        100,
    ) / 100;
  return {
    roster: w.farmers,
    spots: effectiveSpots(w),
    deployed: w.farmers.filter((f) => f.deployed).length,
    hypePerSec: totalIdleHypePerSec(w),
    pendingIdleHype: pendingIdle,
    offlineHarvest: opts?.offline ?? null,
    scoutReadyAt: w.scoutReadyAt,
    pendingScout: w.pendingScout
      ? { speciesId: w.pendingScout, ...FARMER_SPECIES[w.pendingScout] }
      : null,
    activity: activityMultiplier(w.farmers),
    upgrades: w.workerUpgrades,
    autoSeedTier: w.autoSeedTier,
    coverage: {
      automated: coverageAutomated,
      total: w.plots.length,
      fullAuto: coverageAutomated >= w.plots.length && w.plots.length > 0,
    },
  };
}

export function demoFarmSnapshot() {
  const w = getDemoWallet();
  const auto = applyWorkerAutoHarvests();
  const now = new Date();
  const plots = w.plots.map((p) => ({ ...p, status: getPlotStatus(p, now) }));
  const endsAt = new Date(now.getTime() + 7 * 86400000);
  const pendingWorkerIdle = computeIdleHype(w.farmers, w.farmersLastClaimAt, now.getTime());
  const pendingAnimalIdle = computeAnimalIdleHype(
    w.ownedAnimals,
    w.animalIdleClaimAt,
    now.getTime(),
  );
  const pendingIdle = Math.floor((pendingWorkerIdle + pendingAnimalIdle) * 100) / 100;
  const offline =
    auto.welcome && (auto.crops > 0 || auto.planted > 0)
      ? { crops: auto.crops, sp: auto.sp, capped: auto.capped }
      : w.pendingOfflineSummary;
  w.pendingOfflineSummary = null; // one-shot welcome-back payload
  persistDemoWallet();
  return {
    demoSave: exportDemoSave(),
    wallet: {
      address: w.address,
      displayName: w.displayName,
      hypeBalance: String(w.hypeBalance),
      harvestStreak: w.harvestStreak,
      referralCode: w.referralCode,
      xp: w.xp,
      gridSize: w.gridSize,
      hasCompletedTutorial: w.hasCompletedTutorial,
      lastDailyHypeAt: w.lastDailyHypeAt,
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
    farmers: farmersPanelFromWallet(w, { pendingIdle, offline }),
    animals: {
      roster: w.ownedAnimals,
      hypePerSec: animalHypePerSec(w.ownedAnimals),
      pendingIdleHype: pendingAnimalIdle,
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
  persistDemoWallet();
  return {
    plot: { ...plot, status: "growing" },
    hypeBalance: String(w.hypeBalance),
    demoSave: exportDemoSave(),
  };
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
  // Manual early game: harvest pays Hype so players can hire after planting free Basics
  const hypeFromHarvest =
    key === "Mythic" ? 18 : key === "Golden" ? 10 : key === "Hybrid" ? 5 : 3;
  w.hypeBalance += hypeFromHarvest;
  w.harvestStreak = streak;
  w.lastHarvestDay = today;
  plot.seedTier = null;
  plot.plantedAt = null;
  plot.maturesAt = null;
  plot.harvestedAt = now.toISOString();
  plot.status = "empty";
  persistDemoWallet();
  return {
    awarded,
    hypeGained: hypeFromHarvest,
    hypeBalance: String(w.hypeBalance),
    xpGained: xpGain,
    xp: w.xp,
    seasonPoints: String(w.seasonPoints),
    streak,
    blighted: status === "blighted",
    farmerBoost,
    demoSave: exportDemoSave(),
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
  persistDemoWallet();
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
  persistDemoWallet();
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
  persistDemoWallet();
  return {
    plot: { ...plot, status: getPlotStatus(plot) },
  };
}

export function demoCompleteTutorial() {
  const w = getDemoWallet();
  w.hasCompletedTutorial = true;
  persistDemoWallet();
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
  persistDemoWallet();
  return {
    pendingScout: { speciesId, ...FARMER_SPECIES[speciesId] },
    scoutReadyAt: w.scoutReadyAt,
  };
}

export function demoHirePendingFarmer() {
  const w = getDemoWallet();
  if (!w.pendingScout) throw new Error("No scouted farmer waiting — Scout first");
  const species = FARMER_SPECIES[w.pendingScout];
  if (w.farmers.some((f) => f.speciesId === species.id)) {
    throw new Error("Already hired");
  }
  const cost = hireCost(species.rarity, w.farmers.length);
  if (w.hypeBalance < cost) throw new Error(`Need ${cost} Hype to hire`);
  w.hypeBalance -= cost;
  const spots = effectiveSpots(w);
  const deployedCount = w.farmers.filter((x) => x.deployed).length;
  const autoDeploy = deployedCount < spots;
  const farmer: OwnedFarmer = {
    id: `farmer-${randomBytes(4).toString("hex")}`,
    speciesId: w.pendingScout,
    level: 1,
    deployed: autoDeploy,
    hiredAt: new Date().toISOString(),
    lastAutoHarvestAt: autoDeploy ? new Date().toISOString() : null,
  };
  w.farmers.push(farmer);
  w.pendingScout = null;
  persistDemoWallet();
  return {
    farmer,
    hypeBalance: String(w.hypeBalance),
    roster: w.farmers,
    spots,
    autoDeployed: autoDeploy,
    demoSave: exportDemoSave(),
  };
}

/** Direct catalog hire — pick a species from the Hire list. One hire per species. */
export function demoHireSpecies(speciesId: string) {
  const w = getDemoWallet();
  if (!(speciesId in FARMER_SPECIES)) throw new Error("Unknown farmer type");
  const species = FARMER_SPECIES[speciesId as FarmerSpeciesId];
  if (w.farmers.some((f) => f.speciesId === species.id)) {
    throw new Error("Already hired");
  }
  const farmLevel = levelFromXp(w.xp);
  if (farmLevel < species.unlockLevel) {
    throw new Error(`Unlocks at Farm Level ${species.unlockLevel}`);
  }
  const cost = hireCost(species.rarity, w.farmers.length);
  if (w.hypeBalance < cost) throw new Error(`Need ${cost} Hype to hire`);
  w.hypeBalance -= cost;
  const spots = effectiveSpots(w);
  const deployedCount = w.farmers.filter((x) => x.deployed).length;
  const autoDeploy = deployedCount < spots;
  const farmer: OwnedFarmer = {
    id: `farmer-${randomBytes(4).toString("hex")}`,
    speciesId: species.id,
    level: 1,
    deployed: autoDeploy,
    hiredAt: new Date().toISOString(),
    lastAutoHarvestAt: autoDeploy ? new Date().toISOString() : null,
  };
  w.farmers.push(farmer);
  persistDemoWallet();
  return {
    farmer,
    hypeBalance: String(w.hypeBalance),
    roster: w.farmers,
    spots,
    autoDeployed: autoDeploy,
    farmers: farmersPanelFromWallet(w),
    demoSave: exportDemoSave(),
  };
}

export function demoDismissPendingScout() {
  const w = getDemoWallet();
  w.pendingScout = null;
  persistDemoWallet();
  return { ok: true };
}

export function demoDeployFarmer(farmerId: string, deploy: boolean) {
  const w = getDemoWallet();
  const f = w.farmers.find((x) => x.id === farmerId);
  if (!f) throw new Error("Farmer not found");
  const spots = effectiveSpots(w);
  if (deploy) {
    const deployed = w.farmers.filter((x) => x.deployed).length;
    if (!f.deployed && deployed >= spots) {
      throw new Error(`All ${spots} field spots full — bench someone`);
    }
    f.deployed = true;
    if (!f.lastAutoHarvestAt) f.lastAutoHarvestAt = new Date().toISOString();
  } else {
    f.deployed = false;
  }
  persistDemoWallet();
  return {
    farmer: f,
    roster: w.farmers,
    spots: effectiveSpots(w),
    hypeBalance: String(w.hypeBalance),
    farmers: farmersPanelFromWallet(w),
    demoSave: exportDemoSave(),
  };
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
  persistDemoWallet();
  return {
    farmer: f,
    hypeBalance: String(w.hypeBalance),
    farmers: farmersPanelFromWallet(w),
    demoSave: exportDemoSave(),
  };
}

export function demoClaimFarmerIdle() {
  const w = getDemoWallet();
  const workerGain = computeIdleHype(w.farmers, w.farmersLastClaimAt);
  const animalGain = computeAnimalIdleHype(w.ownedAnimals, w.animalIdleClaimAt);
  const gained = Math.floor((workerGain + animalGain) * 100) / 100;
  w.hypeBalance += gained;
  const now = new Date().toISOString();
  w.farmersLastClaimAt = now;
  w.animalIdleClaimAt = now;
  persistDemoWallet();
  return {
    awarded: gained,
    hypeBalance: String(w.hypeBalance),
    hypePerSec: totalIdleHypePerSec(w),
  };
}

export function demoBuyAnimal(speciesId: string) {
  const w = getDemoWallet();
  const species = ANIMAL_SPECIES[speciesId as AnimalSpeciesId];
  if (!species) throw new Error("Unknown animal");
  const farmLevel = levelFromXp(w.xp);
  if (farmLevel < species.unlockLevel) {
    throw new Error(`Requires Farm Level ${species.unlockLevel}`);
  }
  if (w.hypeBalance < species.hypeCost) {
    throw new Error(`Need ${species.hypeCost} Hype`);
  }
  w.hypeBalance -= species.hypeCost;
  const animal: OwnedAnimal = {
    id: `animal-${randomBytes(4).toString("hex")}`,
    speciesId: species.id,
    boughtAt: new Date().toISOString(),
  };
  w.ownedAnimals.push(animal);
  if (!w.animalIdleClaimAt) w.animalIdleClaimAt = new Date().toISOString();
  persistDemoWallet();
  return {
    animal,
    roster: w.ownedAnimals,
    hypeBalance: String(w.hypeBalance),
    hypePerSec: totalIdleHypePerSec(w),
    animalsHypePerSec: animalHypePerSec(w.ownedAnimals),
  };
}

export function demoClaimAnimalIdle() {
  const w = getDemoWallet();
  const gained = computeAnimalIdleHype(w.ownedAnimals, w.animalIdleClaimAt);
  w.hypeBalance += gained;
  w.animalIdleClaimAt = new Date().toISOString();
  persistDemoWallet();
  return {
    awarded: gained,
    hypeBalance: String(w.hypeBalance),
    hypePerSec: totalIdleHypePerSec(w),
    animalsHypePerSec: animalHypePerSec(w.ownedAnimals),
  };
}

export function demoBuyWorkerUpgrade(upgradeId: string) {
  const w = getDemoWallet();
  const id = upgradeId as WorkerUpgradeId;
  const def = WORKER_UPGRADES[id];
  if (!def) throw new Error("Unknown upgrade");
  const current = w.workerUpgrades[id] ?? 0;
  if (current >= def.maxLevel) throw new Error("Upgrade maxed");
  const cost = def.costForNext(current);
  if (w.hypeBalance < cost) throw new Error(`Need ${cost} Hype`);
  w.hypeBalance -= cost;
  w.workerUpgrades[id] = current + 1;
  persistDemoWallet();
  return {
    upgrades: w.workerUpgrades,
    hypeBalance: String(w.hypeBalance),
    spots: effectiveSpots(w),
    farmers: farmersPanelFromWallet(w),
    demoSave: exportDemoSave(),
  };
}

export function demoSetAutoSeedTier(tier: string) {
  const w = getDemoWallet();
  const key = (Object.keys(SEED_DEFS) as SeedTierId[]).find(
    (k) => k.toLowerCase() === tier.toLowerCase(),
  );
  if (!key) throw new Error("Invalid seed tier");
  const farmLevel = levelFromXp(w.xp);
  if (farmLevel < SEED_DEFS[key].unlockLevel) {
    throw new Error(`Unlocks at Farm Level ${SEED_DEFS[key].unlockLevel}`);
  }
  w.autoSeedTier = key;
  persistDemoWallet();
  return {
    autoSeedTier: w.autoSeedTier,
    farmers: farmersPanelFromWallet(w),
    demoSave: exportDemoSave(),
  };
}

export function demoAckOfflineSummary() {
  return { summary: consumeOfflineSummary() };
}

export function demoPlaceDecor(itemId: string) {
  const w = getDemoWallet();
  const item = DECOR_ITEMS[itemId as DecorItemId];
  if (!item) throw new Error("Unknown decor item");
  const farmLevel = levelFromXp(w.xp);
  if (farmLevel < item.unlockLevel) {
    throw new Error(`Requires Farm Level ${item.unlockLevel}`);
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
  persistDemoWallet();
  return { placement: placed, decor: w.decor, hypeBalance: String(w.hypeBalance) };
}

void STARTER_PLOTS;
