import { describe, expect, it } from "vitest";
import { PIXEL_SCALE, TILE_SCREEN, TILE_SIZE, gridToScreen, screenToGrid } from "@/game/tile";
import { barnTextureKey, barnVisualFromLevel } from "@/lib/game/barnVisual";
import { soilCells } from "@/game/farmLayout";

describe("stardew orthogonal grid", () => {
  it("uses 16px tiles at integer scale 4", () => {
    expect(TILE_SIZE).toBe(16);
    expect(PIXEL_SCALE).toBe(4);
    expect(TILE_SCREEN).toBe(64);
    expect(Number.isInteger(PIXEL_SCALE)).toBe(true);
  });

  it("maps grid to screen without iso math", () => {
    expect(gridToScreen(2, 3)).toEqual({ x: 128, y: 192 });
    expect(screenToGrid(128, 192)).toEqual({ gridX: 2, gridY: 3 });
  });

  it("has a designed soil cluster", () => {
    expect(soilCells().length).toBeGreaterThanOrEqual(9);
  });
});

describe("barn milestones still map", () => {
  it("has 4+ visual states", () => {
    expect(barnVisualFromLevel(1)).toBe(1);
    expect(barnVisualFromLevel(5)).toBe(5);
    expect(barnVisualFromLevel(20)).toBe(20);
    expect(barnTextureKey(12)).toBe("building_barn_l10");
  });
});
