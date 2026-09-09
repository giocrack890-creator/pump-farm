import { describe, expect, it } from "vitest";
import { xpForLevel, levelFromXp, xpProgress } from "@/lib/game/xp";

describe("xp", () => {
  it("level 1 requires 0 xp", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(levelFromXp(0)).toBe(1);
  });

  it("monotonic curve", () => {
    expect(xpForLevel(5)).toBeGreaterThan(xpForLevel(4));
    expect(levelFromXp(xpForLevel(10))).toBe(10);
  });

  it("progress ratio clamps", () => {
    const p = xpProgress(0);
    expect(p.level).toBe(1);
    expect(p.ratio).toBeGreaterThanOrEqual(0);
    expect(p.ratio).toBeLessThanOrEqual(1);
  });
});
