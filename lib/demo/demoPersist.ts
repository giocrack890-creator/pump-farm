/**
 * Persist demo farm across server restarts / Vercel cold starts.
 * Disk = best-effort; browser localStorage (via hydrate API) is the source of truth on prod.
 */

import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { FARMER_SPECIES, type FarmerSpeciesId, type OwnedFarmer } from "@/lib/game/farmers";
import { ANIMAL_SPECIES, type AnimalSpeciesId, type OwnedAnimal } from "@/lib/game/animals";
import {
  DEFAULT_WORKER_UPGRADES,
  type WorkerUpgradeLevels,
} from "@/lib/game/workerUpgrades";
import type { DecorPlacement } from "@/lib/game/decor";
import { DEMO_ADDRESS, type DemoPlot, type DemoWallet } from "@/lib/demo/farmMemoryTypes";
import type { SeedTierId } from "@/lib/game/seeds";
import { SEED_DEFS } from "@/lib/game/seeds";

export { DEMO_ADDRESS };
export const DEMO_SAVE_KEY = "pumpfarm_demo_save_v1";

function persistPath(): string {
  const base = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), ".data");
  return path.join(base, "demo-farm-v1.json");
}

export function readDemoDisk(): DemoWallet | null {
  try {
    const p = persistPath();
    if (!fs.existsSync(p)) return null;
    return normalizeDemoWallet(JSON.parse(fs.readFileSync(p, "utf8")));
  } catch {
    return null;
  }
}

export function writeDemoDisk(w: DemoWallet): void {
  try {
    const p = persistPath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(w));
  } catch {
    /* ignore */
  }
}

function isFarmerSpeciesId(id: unknown): id is FarmerSpeciesId {
  return typeof id === "string" && id in FARMER_SPECIES;
}

function isAnimalSpeciesId(id: unknown): id is AnimalSpeciesId {
  return typeof id === "string" && id in ANIMAL_SPECIES;
}

export function normalizeDemoWallet(raw: unknown): DemoWallet | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  // Accept number or numeric string (API sometimes stringifies balances)
  const hypeNum = Number(o.hypeBalance);
  if (!Number.isFinite(hypeNum) || !Array.isArray(o.plots)) return null;

  const farmers: OwnedFarmer[] = [];
  if (Array.isArray(o.farmers)) {
    for (const f of o.farmers) {
      if (!f || typeof f !== "object") continue;
      const fr = f as Record<string, unknown>;
      if (typeof fr.id !== "string" || !isFarmerSpeciesId(fr.speciesId)) continue;
      farmers.push({
        id: fr.id,
        speciesId: fr.speciesId,
        level: Math.min(10, Math.max(1, Number(fr.level) || 1)),
        deployed: Boolean(fr.deployed),
        hiredAt: typeof fr.hiredAt === "string" ? fr.hiredAt : new Date().toISOString(),
        lastAutoHarvestAt:
          typeof fr.lastAutoHarvestAt === "string" ? fr.lastAutoHarvestAt : null,
      });
    }
  }

  const ownedAnimals: OwnedAnimal[] = [];
  if (Array.isArray(o.ownedAnimals)) {
    for (const a of o.ownedAnimals) {
      if (!a || typeof a !== "object") continue;
      const ar = a as Record<string, unknown>;
      if (typeof ar.id !== "string" || !isAnimalSpeciesId(ar.speciesId)) continue;
      ownedAnimals.push({
        id: ar.id,
        speciesId: ar.speciesId,
        boughtAt: typeof ar.boughtAt === "string" ? ar.boughtAt : new Date().toISOString(),
      });
    }
  }

  const plots: DemoPlot[] = (o.plots as DemoPlot[]).map((p, i) => ({
    id: typeof p?.id === "string" ? p.id : `demo-plot-${i}`,
    index: typeof p?.index === "number" ? p.index : i,
    gridX: Number(p?.gridX) || 0,
    gridY: Number(p?.gridY) || 0,
    seedTier: p?.seedTier ?? null,
    plantedAt: p?.plantedAt ?? null,
    maturesAt: p?.maturesAt ?? null,
    harvestedAt: p?.harvestedAt ?? null,
    status: typeof p?.status === "string" ? p.status : "empty",
  }));
  if (plots.length === 0) return null;

  const wu = (o.workerUpgrades as WorkerUpgradeLevels | undefined) ?? {
    ...DEFAULT_WORKER_UPGRADES,
  };

  const rawAuto = o.autoSeedTier;
  const autoSeedTier: SeedTierId =
    typeof rawAuto === "string" && rawAuto in SEED_DEFS
      ? (rawAuto as SeedTierId)
      : "Basic";

  return {
    address: typeof o.address === "string" ? o.address : DEMO_ADDRESS,
    hypeBalance: Math.max(0, hypeNum),
    harvestStreak: Math.max(0, Number(o.harvestStreak) || 0),
    lastHarvestDay: typeof o.lastHarvestDay === "string" ? o.lastHarvestDay : null,
    lastDailyHypeAt: typeof o.lastDailyHypeAt === "string" ? o.lastDailyHypeAt : null,
    referralCode:
      typeof o.referralCode === "string" ? o.referralCode : randomBytes(4).toString("hex"),
    plots,
    seasonPoints: Math.max(0, Number(o.seasonPoints) || 0),
    xp: Math.max(0, Number(o.xp) || 0),
    gridSize: Math.max(3, Number(o.gridSize) || 3),
    hasCompletedTutorial: Boolean(o.hasCompletedTutorial),
    farmers,
    scoutReadyAt: Number(o.scoutReadyAt) || 0,
    pendingScout: isFarmerSpeciesId(o.pendingScout) ? o.pendingScout : null,
    farmersLastClaimAt:
      typeof o.farmersLastClaimAt === "string"
        ? o.farmersLastClaimAt
        : new Date().toISOString(),
    ownedAnimals,
    animalIdleClaimAt:
      typeof o.animalIdleClaimAt === "string"
        ? o.animalIdleClaimAt
        : new Date().toISOString(),
    decor: Array.isArray(o.decor) ? (o.decor as DecorPlacement[]) : [],
    lastSeenAt: typeof o.lastSeenAt === "string" ? o.lastSeenAt : new Date().toISOString(),
    pendingOfflineSummary:
      o.pendingOfflineSummary && typeof o.pendingOfflineSummary === "object"
        ? (o.pendingOfflineSummary as DemoWallet["pendingOfflineSummary"])
        : null,
    workerUpgrades: {
      sweep_speed: Number(wu.sweep_speed) || 0,
      worker_slots: Number(wu.worker_slots) || 0,
      yield_bonus: Number(wu.yield_bonus) || 0,
    },
    autoSeedTier,
  };
}
