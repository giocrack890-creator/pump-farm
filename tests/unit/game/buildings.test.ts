import { describe, expect, it } from "vitest";
import { siloTierFromBalance, BARN_TIERS } from "@/lib/game/buildings";
import { companionsUnlocked } from "@/lib/game/companions";

describe("buildings", () => {
  it("maps treasury to silo tier", () => {
    expect(siloTierFromBalance(0)).toBe(1);
    expect(siloTierFromBalance(10)).toBe(2);
    expect(siloTierFromBalance(50)).toBe(3);
  });

  it("barn tier 2 gated at 15", () => {
    expect(BARN_TIERS[2].unlockLevel).toBe(15);
  });
});

describe("companions", () => {
  it("locked before level 10", () => {
    expect(companionsUnlocked(9)).toHaveLength(0);
    expect(companionsUnlocked(10).length).toBeGreaterThan(0);
  });
});
