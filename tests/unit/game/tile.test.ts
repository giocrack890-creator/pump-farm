import { describe, expect, it } from "vitest";
import { soilCells, TILE_SIZE, MAP_WIDTH } from "@/game/farmLayout";
import { gridToScreen, integerZoom } from "@/game/tile";

describe("tile / farm layout (v9 pack)", () => {
  it("uses 32px orthogonal tiles", () => {
    expect(TILE_SIZE).toBe(32);
    expect(MAP_WIDTH).toBeGreaterThan(0);
  });

  it("maps grid to screen without iso math", () => {
    const p = gridToScreen(2, 3);
    expect(p.x).toBe(2 * 32 + 16);
    expect(p.y).toBe(3 * 32 + 16);
  });

  it("locks camera zoom to integers", () => {
    expect(integerZoom(800, 600, 768, 640)).toBe(1);
    expect(integerZoom(1600, 1280, 768, 640)).toBe(2);
  });

  it("exposes authored soil cluster", () => {
    const cells = soilCells();
    expect(cells.length).toBe(9);
    expect(cells[0]).toEqual({ gridX: 22, gridY: 20 });
    expect(cells[cells.length - 1]).toEqual({ gridX: 24, gridY: 22 });
  });
});
