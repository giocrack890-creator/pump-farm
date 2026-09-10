/**
 * Worker auto-harvest + offline progress — server-authoritative helpers.
 * Manual tap-harvest still works; workers add a passive path.
 */

import Decimal from "decimal.js";

export const OFFLINE_CAP_MS = 8 * 3600_000; // 8h abuse cap

/** Base sweep interval by rarity (ms). Lower = faster auto-harvest. */
export const WORKER_SWEEP_MS = {
  common: 60_000,
  rare: 45_000,
  epic: 30_000,
  legendary: 20_000,
} as const;

export type AutoHarvestPlot = {
  id: string;
  seedTier: string | null;
  plantedAt: string | null;
  maturesAt: string | null;
  status: string;
};

export type AutoHarvestWorker = {
  id: string;
  rarity: keyof typeof WORKER_SWEEP_MS;
  deployed: boolean;
  level?: number;
  /** When this worker last successfully auto-harvested (iso). */
  lastAutoHarvestAt?: string | null;
  /** Optional override for sweep interval (ms) after upgrades. */
  intervalMs?: number;
};

export type AutoHarvestEvent = {
  type: "harvest" | "plant";
  plotId: string;
  workerId: string;
  atMs: number;
  seedTier?: string;
};

/**
 * Plots one deployed worker can automate.
 * Base 1 + level growth + optional upgrade bonus.
 * Tuned so 5 maxed (L10) workers cover a full 5×5 expand (25 plots).
 */
export function plotsPerWorker(level: number, upgradeBonus = 0): number {
  const lv = Math.max(1, Math.min(10, Math.floor(level) || 1));
  const bonus = Math.max(0, Math.floor(upgradeBonus));
  return 1 + Math.floor((lv - 1) / 2) + bonus;
}

/** Soft +plots from idle upgrades (capped). */
export function coverageUpgradeBonus(opts: {
  sweep_speed?: number;
  yield_bonus?: number;
}): number {
  const sweep = Math.max(0, opts.sweep_speed ?? 0);
  const yieldB = Math.max(0, opts.yield_bonus ?? 0);
  return Math.min(2, Math.floor((sweep + yieldB) / 2));
}

export function totalAutomationCapacity(
  workers: { level: number; deployed: boolean }[],
  upgradeBonus = 0,
): number {
  return workers
    .filter((w) => w.deployed)
    .reduce((sum, w) => sum + plotsPerWorker(w.level, upgradeBonus), 0);
}

/** Assign plot ids to deployed workers in order (stable, no overlap). */
export function assignPlotsToWorkers(
  plotIds: string[],
  workers: { id: string; level: number; deployed: boolean }[],
  upgradeBonus = 0,
): Map<string, string[]> {
  const deployed = workers.filter((w) => w.deployed);
  const map = new Map<string, string[]>();
  for (const w of deployed) map.set(w.id, []);
  let cursor = 0;
  for (const w of deployed) {
    const n = plotsPerWorker(w.level, upgradeBonus);
    const list = map.get(w.id)!;
    for (let i = 0; i < n && cursor < plotIds.length; i++) {
      list.push(plotIds[cursor]!);
      cursor += 1;
    }
  }
  return map;
}

export function automatedPlotCount(
  plotCount: number,
  workers: { level: number; deployed: boolean }[],
  upgradeBonus = 0,
): number {
  return Math.min(plotCount, totalAutomationCapacity(workers, upgradeBonus));
}

/**
 * Simulate worker sweeps from `fromMs` → `toMs`.
 * Harvests ready assigned plots, then plants empty ones when Hype allows.
 */
export function planWorkerAutoHarvests(opts: {
  plots: AutoHarvestPlot[];
  workers: AutoHarvestWorker[];
  fromMs: number;
  toMs: number;
  /** When set, empty assigned plots are planted during the window. */
  autoSeedTier?: string | null;
  seedCost?: number;
  growMs?: number;
  hypeBalance?: number;
  upgradeBonus?: number;
}): AutoHarvestEvent[] {
  const {
    plots,
    workers,
    fromMs,
    toMs,
    autoSeedTier = null,
    seedCost = 0,
    growMs = 12_000,
    upgradeBonus = 0,
  } = opts;
  let hype = opts.hypeBalance ?? 0;
  if (toMs <= fromMs) return [];

  const deployed = workers.filter((w) => w.deployed);
  if (!deployed.length) return [];

  const plotIds = plots.map((p) => p.id);
  const assignment = assignPlotsToWorkers(
    plotIds,
    deployed.map((w) => ({
      id: w.id,
      level: w.level ?? 1,
      deployed: true,
    })),
    upgradeBonus,
  );

  type SimPlot = AutoHarvestPlot & {
    empty: boolean;
  };
  const state: SimPlot[] = plots.map((p) => ({
    ...p,
    empty: p.status === "empty" || !p.seedTier,
  }));
  const byId = new Map(state.map((p) => [p.id, p]));

  const events: AutoHarvestEvent[] = [];

  for (const w of deployed) {
    const assigned = new Set(assignment.get(w.id) ?? []);
    if (assigned.size === 0) continue;

    const interval =
      w.intervalMs ?? WORKER_SWEEP_MS[w.rarity] ?? WORKER_SWEEP_MS.common;
    let t = Math.max(
      fromMs,
      w.lastAutoHarvestAt ? new Date(w.lastAutoHarvestAt).getTime() + interval : fromMs,
    );
    if (t === fromMs) t = fromMs + interval;

    while (t <= toMs) {
      const ready = state.find((p) => {
        if (!assigned.has(p.id) || p.empty || !p.maturesAt || !p.seedTier) return false;
        return new Date(p.maturesAt).getTime() <= t;
      });
      if (ready) {
        ready.empty = true;
        ready.seedTier = null;
        ready.plantedAt = null;
        ready.maturesAt = null;
        ready.status = "empty";
        events.push({
          type: "harvest",
          plotId: ready.id,
          workerId: w.id,
          atMs: t,
        });
      } else if (autoSeedTier && seedCost >= 0) {
        const empty = state.find((p) => assigned.has(p.id) && p.empty);
        if (empty && hype >= seedCost) {
          hype -= seedCost;
          empty.empty = false;
          empty.seedTier = autoSeedTier;
          empty.plantedAt = new Date(t).toISOString();
          empty.maturesAt = new Date(t + growMs).toISOString();
          empty.status = "growing";
          events.push({
            type: "plant",
            plotId: empty.id,
            workerId: w.id,
            atMs: t,
            seedTier: autoSeedTier,
          });
        }
      }
      t += interval;
    }
  }

  events.sort((a, b) => a.atMs - b.atMs || a.plotId.localeCompare(b.plotId));
  void byId;
  return events;
}

export function cappedOfflineWindow(lastSeenAt: string | null | undefined, nowMs: number): {
  fromMs: number;
  toMs: number;
  capped: boolean;
} {
  const toMs = nowMs;
  if (!lastSeenAt) {
    return { fromMs: nowMs, toMs, capped: false };
  }
  const rawFrom = new Date(lastSeenAt).getTime();
  const span = toMs - rawFrom;
  if (span <= 0) return { fromMs: nowMs, toMs, capped: false };
  if (span > OFFLINE_CAP_MS) {
    return { fromMs: toMs - OFFLINE_CAP_MS, toMs, capped: true };
  }
  return { fromMs: rawFrom, toMs, capped: false };
}

/** Sum SP with Decimal — caller supplies per-plot yield. */
export function sumAutoHarvestSp(yields: number[]): Decimal {
  return yields.reduce((acc, y) => acc.plus(y), new Decimal(0));
}
