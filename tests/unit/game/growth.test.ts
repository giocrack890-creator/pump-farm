import { describe, expect, it } from "vitest";
import {
  computeHarvestPoints,
  computeGrowthProgress,
  computeMaturesAt,
  getPlotStatus,
} from "@/lib/game/growth";

describe("growth", () => {
  it("matures after tier hours", () => {
    const planted = new Date("2026-01-01T00:00:00Z");
    const matures = computeMaturesAt(planted, "Basic");
    expect(matures.toISOString()).toBe("2026-01-01T04:00:00.000Z");
  });

  it("progress clamps 0-1", () => {
    const planted = new Date("2026-01-01T00:00:00Z");
    const matures = new Date("2026-01-01T04:00:00Z");
    expect(computeGrowthProgress(planted, matures, new Date("2025-12-31T00:00:00Z"))).toBe(0);
    expect(computeGrowthProgress(planted, matures, new Date("2026-01-01T02:00:00Z"))).toBe(0.5);
    expect(computeGrowthProgress(planted, matures, new Date("2026-01-02T00:00:00Z"))).toBe(1);
  });

  it("blight activates 6h after maturity", () => {
    const plot = {
      seedTier: "Basic",
      plantedAt: new Date("2026-01-01T00:00:00Z"),
      maturesAt: new Date("2026-01-01T04:00:00Z"),
    };
    expect(getPlotStatus(plot, new Date("2026-01-01T03:00:00Z"))).toBe("growing");
    expect(getPlotStatus(plot, new Date("2026-01-01T05:00:00Z"))).toBe("ready");
    expect(getPlotStatus(plot, new Date("2026-01-01T10:00:00Z"))).toBe("blighted");
  });

  it("stacks multipliers and caps blight loss", () => {
    const clean = computeHarvestPoints({
      baseYield: 10,
      stakeMult: 1.1,
      streakMult: 1.2,
      goldenMult: 3,
    });
    expect(clean).toBeCloseTo(39.6, 5);
    const blighted = computeHarvestPoints({
      baseYield: 100,
      blighted: true,
    });
    expect(blighted).toBe(60);
  });
});
