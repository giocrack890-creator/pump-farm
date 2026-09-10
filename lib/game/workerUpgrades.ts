/**
 * Shop upgrades for idle auto-farming — Hype-priced, server-validated.
 */

export type WorkerUpgradeId = "sweep_speed" | "worker_slots" | "yield_bonus";

export type WorkerUpgradeDef = {
  id: WorkerUpgradeId;
  name: string;
  blurb: string;
  /** Hype cost for purchasing level n+1 (0-indexed next). */
  costForNext: (currentLevel: number) => number;
  maxLevel: number;
};

export const WORKER_UPGRADES: Record<WorkerUpgradeId, WorkerUpgradeDef> = {
  sweep_speed: {
    id: "sweep_speed",
    name: "Faster Sweeps",
    blurb: "Workers check ready crops more often (−10% interval / level).",
    costForNext: (lv) => 80 + lv * 60,
    maxLevel: 5,
  },
  worker_slots: {
    id: "worker_slots",
    name: "Extra Field Spots",
    blurb: "Field is capped at 5 workers — already unlocked.",
    costForNext: (lv) => 120 + lv * 100,
    maxLevel: 3,
  },
  yield_bonus: {
    id: "yield_bonus",
    name: "Worker Yield Tips",
    blurb: "+4% SP on auto-harvests per level.",
    costForNext: (lv) => 100 + lv * 75,
    maxLevel: 5,
  },
};

export type WorkerUpgradeLevels = Record<WorkerUpgradeId, number>;

export const DEFAULT_WORKER_UPGRADES: WorkerUpgradeLevels = {
  sweep_speed: 0,
  worker_slots: 0,
  yield_bonus: 0,
};

/** Interval multiplier: level 1 → 0.9, level 5 → 0.5 */
export function sweepIntervalMult(level: number): number {
  return Math.max(0.5, 1 - 0.1 * Math.max(0, level));
}

export function bonusFieldSpots(level: number): number {
  return Math.max(0, Math.min(3, level));
}

export function autoYieldMult(level: number): number {
  return 1 + 0.04 * Math.max(0, level);
}
