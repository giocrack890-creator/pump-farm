import { describe, expect, it } from "vitest";
import { TILE_HEIGHT, TILE_WIDTH, grassVariant, isoDepth, isoToScreen } from "@/game/iso";
import { barnTextureKey, barnVisualFromLevel } from "@/lib/game/barnVisual";
import { nextUnlockLabel, unlocksAtLevel } from "@/lib/game/xp";

describe("isometric placement", () => {
  it("uses 2:1 diamond tile footprint", () => {
    expect(TILE_WIDTH).toBe(256);
    expect(TILE_HEIGHT).toBe(128);
    expect(TILE_WIDTH / TILE_HEIGHT).toBe(2);
  });

  it("maps grid to screen with proven iso formula", () => {
    expect(isoToScreen(0, 0)).toEqual({ x: 0, y: 0 });
    expect(isoToScreen(1, 0)).toEqual({ x: 128, y: 64 });
    expect(isoToScreen(0, 1)).toEqual({ x: -128, y: 64 });
    expect(isoToScreen(2, 1)).toEqual({ x: 128, y: 192 });
  });

  it("depth sorts by gridX + gridY", () => {
    expect(isoDepth(2, 3, 0)).toBe(50);
    expect(isoDepth(2, 3, 4)).toBe(54);
  });

  it("grass variants are deterministic", () => {
    expect(grassVariant(0, 0)).toBe(grassVariant(0, 0));
  });
});

describe("barn visual milestones", () => {
  it("maps farm levels to at least 4 visual states", () => {
    expect(barnVisualFromLevel(1)).toBe(1);
    expect(barnVisualFromLevel(5)).toBe(5);
    expect(barnVisualFromLevel(10)).toBe(10);
    expect(barnVisualFromLevel(15)).toBe(15);
    expect(barnVisualFromLevel(20)).toBe(20);
    expect(barnTextureKey(12)).toBe("building_barn_l10");
  });
});

describe("xp next milestone labels", () => {
  it("surfaces a concrete next unlock", () => {
    expect(nextUnlockLabel(1)).toMatch(/Hybrid/i);
    expect(unlocksAtLevel(5).some((s) => /Hybrid|expansion|Exchange/i.test(s))).toBe(true);
  });
});
