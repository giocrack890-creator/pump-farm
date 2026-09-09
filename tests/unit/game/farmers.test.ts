import { describe, expect, it } from "vitest";
import {
  activityMultiplier,
  computeIdleHype,
  fieldSpotsForLevel,
  hireCost,
  pickScoutSpecies,
  type OwnedFarmer,
} from "@/lib/game/farmers";

describe("farmers hire/deploy math", () => {
  it("scales hire cost with roster", () => {
    expect(hireCost("common", 0)).toBe(40);
    expect(hireCost("common", 5)).toBeGreaterThan(hireCost("common", 0));
  });

  it("unlocks field spots with farm level", () => {
    expect(fieldSpotsForLevel(1)).toBe(3);
    expect(fieldSpotsForLevel(9)).toBeGreaterThan(3);
    expect(fieldSpotsForLevel(99)).toBe(8);
  });

  it("activity scales with deployed income, capped at 4", () => {
    const farmers: OwnedFarmer[] = [
      {
        id: "1",
        speciesId: "farm_mogul",
        level: 5,
        deployed: true,
        hiredAt: new Date().toISOString(),
      },
      {
        id: "2",
        speciesId: "mythic_tiller",
        level: 5,
        deployed: true,
        hiredAt: new Date().toISOString(),
      },
    ];
    expect(activityMultiplier(farmers)).toBeLessThanOrEqual(4);
    expect(activityMultiplier([])).toBe(1);
  });

  it("computes idle hype with offline cap", () => {
    const farmers: OwnedFarmer[] = [
      {
        id: "1",
        speciesId: "field_hand",
        level: 1,
        deployed: true,
        hiredAt: new Date().toISOString(),
      },
    ];
    const now = Date.now();
    const hourAgo = new Date(now - 3600_000).toISOString();
    const gained = computeIdleHype(farmers, hourAgo, now);
    expect(gained).toBeGreaterThan(0);
  });

  it("scouts a valid species for level 1", () => {
    const id = pickScoutSpecies(1, () => 0.01);
    expect(id).toBeTruthy();
  });
});
