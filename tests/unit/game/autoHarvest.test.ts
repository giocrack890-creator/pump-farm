import { describe, expect, it } from "vitest";
import {
  assignPlotsToWorkers,
  automatedPlotCount,
  cappedOfflineWindow,
  OFFLINE_CAP_MS,
  planWorkerAutoHarvests,
  plotsPerWorker,
  sumAutoHarvestSp,
  WORKER_SWEEP_MS,
} from "@/lib/game/autoHarvest";
import { isFlatFramePixels, cropFrameForTier, CROP_FRAMES } from "@/game/cropFrames";
import {
  autoYieldMult,
  bonusFieldSpots,
  sweepIntervalMult,
  WORKER_UPGRADES,
} from "@/lib/game/workerUpgrades";

describe("worker auto-harvest planner", () => {
  it("harvests a ready plot on the first sweep after interval", () => {
    const t0 = 1_000_000;
    const plots = [
      {
        id: "p1",
        seedTier: "Basic",
        plantedAt: new Date(t0 - 60_000).toISOString(),
        maturesAt: new Date(t0).toISOString(),
        status: "ready",
      },
    ];
    const workers = [
      {
        id: "w1",
        rarity: "common" as const,
        deployed: true,
        level: 1,
        lastAutoHarvestAt: null,
        intervalMs: 10_000,
      },
    ];
    const events = planWorkerAutoHarvests({
      plots,
      workers,
      fromMs: t0,
      toMs: t0 + 25_000,
    });
    expect(events.length).toBe(1);
    expect(events[0]?.plotId).toBe("p1");
    expect(events[0]?.workerId).toBe("w1");
    expect(events[0]?.type).toBe("harvest");
  });

  it("does not double-harvest the same plot", () => {
    const t0 = 2_000_000;
    const plots = [
      {
        id: "p1",
        seedTier: "Basic",
        plantedAt: new Date(t0 - 10_000).toISOString(),
        maturesAt: new Date(t0).toISOString(),
        status: "ready",
      },
    ];
    const events = planWorkerAutoHarvests({
      plots,
      workers: [
        { id: "a", rarity: "legendary", deployed: true, level: 1, intervalMs: 5_000 },
        { id: "b", rarity: "legendary", deployed: true, level: 1, intervalMs: 5_000 },
      ],
      fromMs: t0,
      toMs: t0 + 30_000,
    });
    expect(events.filter((e) => e.plotId === "p1" && e.type === "harvest")).toHaveLength(1);
  });

  it("ignores benched workers", () => {
    const t0 = 3_000_000;
    const events = planWorkerAutoHarvests({
      plots: [
        {
          id: "p1",
          seedTier: "Basic",
          plantedAt: new Date(t0).toISOString(),
          maturesAt: new Date(t0).toISOString(),
          status: "ready",
        },
      ],
      workers: [{ id: "w", rarity: "common", deployed: false, level: 1 }],
      fromMs: t0,
      toMs: t0 + WORKER_SWEEP_MS.common * 3,
    });
    expect(events).toEqual([]);
  });

  it("plants empty assigned plots when affordable", () => {
    const t0 = 4_000_000;
    const events = planWorkerAutoHarvests({
      plots: [
        {
          id: "p1",
          seedTier: null,
          plantedAt: null,
          maturesAt: null,
          status: "empty",
        },
      ],
      workers: [
        {
          id: "w1",
          rarity: "common",
          deployed: true,
          level: 1,
          lastAutoHarvestAt: null,
          intervalMs: 5_000,
        },
      ],
      fromMs: t0,
      toMs: t0 + 12_000,
      autoSeedTier: "Basic",
      seedCost: 5,
      growMs: 12_000,
      hypeBalance: 50,
    });
    expect(events.some((e) => e.type === "plant" && e.plotId === "p1")).toBe(true);
  });

  it("does not plant without deployed workers (zero automation)", () => {
    const t0 = 5_000_000;
    const events = planWorkerAutoHarvests({
      plots: [
        {
          id: "p1",
          seedTier: null,
          plantedAt: null,
          maturesAt: null,
          status: "empty",
        },
      ],
      workers: [],
      fromMs: t0,
      toMs: t0 + 60_000,
      autoSeedTier: "Basic",
      seedCost: 5,
      hypeBalance: 500,
    });
    expect(events).toEqual([]);
  });

  it("caps offline window at 8h", () => {
    const now = Date.now();
    const last = new Date(now - 20 * 3600_000).toISOString();
    const w = cappedOfflineWindow(last, now);
    expect(w.capped).toBe(true);
    expect(w.toMs - w.fromMs).toBe(OFFLINE_CAP_MS);
  });

  it("sums SP with Decimal", () => {
    expect(sumAutoHarvestSp([1.1, 2.2, 3.3]).toString()).toBe("6.6");
  });
});

describe("worker coverage", () => {
  it("scales plots per worker with level", () => {
    expect(plotsPerWorker(1)).toBe(1);
    expect(plotsPerWorker(3)).toBe(2);
    expect(plotsPerWorker(10)).toBe(5);
  });

  it("assigns non-overlapping plots and can cover starter grid", () => {
    const plotIds = Array.from({ length: 9 }, (_, i) => `p${i}`);
    const workers = [
      { id: "a", level: 1, deployed: true },
      { id: "b", level: 3, deployed: true },
      { id: "c", level: 5, deployed: true },
    ];
    const map = assignPlotsToWorkers(plotIds, workers);
    const all = [...map.values()].flat();
    expect(new Set(all).size).toBe(all.length);
    expect(automatedPlotCount(9, workers)).toBe(1 + 2 + 3);
  });

  it("five maxed workers cover 25 expand plots", () => {
    const workers = Array.from({ length: 5 }, (_, i) => ({
      id: `w${i}`,
      level: 10,
      deployed: true,
    }));
    expect(automatedPlotCount(25, workers)).toBe(25);
  });
});

describe("crop frames", () => {
  it("maps tiers to verified ready frames", () => {
    expect(cropFrameForTier("Basic", 3)).toBe(CROP_FRAMES.turnip.ready);
    expect(cropFrameForTier("Hybrid", 3)).toBe(CROP_FRAMES.carrot.ready);
    expect(cropFrameForTier("Golden", 3)).toBe(CROP_FRAMES.wheat.ready);
    expect(cropFrameForTier("Mythic", 3)).toBe(CROP_FRAMES.pumpkin.ready);
  });

  it("detects flat sampled frames", () => {
    const flat = new Uint8ClampedArray(32 * 32 * 4);
    for (let i = 0; i < flat.length; i += 4) {
      flat[i] = 40;
      flat[i + 1] = 180;
      flat[i + 2] = 40;
      flat[i + 3] = 255;
    }
    expect(isFlatFramePixels(flat)).toBe(true);

    const varied = new Uint8ClampedArray(32 * 32 * 4);
    for (let i = 0; i < varied.length; i += 4) {
      const n = i / 4;
      varied[i] = (n * 13) % 255;
      varied[i + 1] = (n * 29) % 255;
      varied[i + 2] = (n * 47) % 255;
      varied[i + 3] = 255;
    }
    expect(isFlatFramePixels(varied)).toBe(false);
  });
});

describe("worker upgrades", () => {
  it("prices and caps upgrades", () => {
    expect(WORKER_UPGRADES.sweep_speed.costForNext(0)).toBe(80);
    expect(sweepIntervalMult(5)).toBe(0.5);
    expect(bonusFieldSpots(2)).toBe(2);
    expect(autoYieldMult(2)).toBeCloseTo(1.08);
  });
});
