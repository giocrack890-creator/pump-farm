import { describe, expect, it } from "vitest";
import { holdingBonus, streakMultiplier, nextStreak } from "@/lib/game/hype";

describe("hype", () => {
  it("holding soft-caps", () => {
    expect(holdingBonus(0)).toBe(0);
    expect(holdingBonus(100)).toBeCloseTo(20, 5);
    expect(holdingBonus(1_000_000)).toBe(100);
  });

  it("streak caps at +20%", () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(7)).toBeCloseTo(1.2, 5);
    expect(streakMultiplier(99)).toBeCloseTo(1.2, 5);
  });

  it("resets streak after a missed day", () => {
    expect(nextStreak("2026-01-01", "2026-01-03", 5)).toBe(1);
    expect(nextStreak("2026-01-02", "2026-01-03", 5)).toBe(6);
    expect(nextStreak("2026-01-03", "2026-01-03", 5)).toBe(5);
  });
});
