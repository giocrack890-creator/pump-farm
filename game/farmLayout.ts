/**
 * Hand-authored Stardew-style starter farm (orthogonal).
 * G = grass, S = soil (plots), P = path, W = water, L = locked, B = building pad
 */

export type GroundCell = "G" | "S" | "P" | "W" | "L" | "B";

export const MAP_ORIGIN_X = -1;
export const MAP_ORIGIN_Y = -1;

/** Rows = Y, cols = X. Designed composition — never random scatter. */
export const STARTER_GROUND: GroundCell[][] = [
  ["L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L"],
  ["L", "G", "G", "G", "G", "G", "G", "G", "W", "W", "L"],
  ["L", "G", "P", "P", "P", "P", "P", "G", "W", "W", "L"],
  ["L", "G", "P", "B", "B", "B", "P", "G", "G", "G", "L"],
  ["L", "G", "P", "B", "B", "B", "P", "S", "S", "S", "L"],
  ["L", "G", "P", "P", "P", "P", "P", "S", "S", "S", "L"],
  ["L", "G", "G", "G", "G", "G", "G", "S", "S", "S", "L"],
  ["L", "G", "G", "G", "G", "G", "G", "G", "G", "G", "L"],
  ["L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L"],
];

export function groundAt(gridX: number, gridY: number): GroundCell {
  const lx = gridX - MAP_ORIGIN_X;
  const ly = gridY - MAP_ORIGIN_Y;
  if (ly < 0 || lx < 0 || ly >= STARTER_GROUND.length || lx >= STARTER_GROUND[0]!.length) {
    return "L";
  }
  return STARTER_GROUND[ly]![lx]!;
}

export function mapBounds() {
  return {
    minX: MAP_ORIGIN_X,
    minY: MAP_ORIGIN_Y,
    maxX: MAP_ORIGIN_X + STARTER_GROUND[0]!.length - 1,
    maxY: MAP_ORIGIN_Y + STARTER_GROUND.length - 1,
  };
}

/** Soil cells that map to playable plot indices (row-major within soil cluster). */
export function soilCells(): { gridX: number; gridY: number }[] {
  const out: { gridX: number; gridY: number }[] = [];
  for (let ly = 0; ly < STARTER_GROUND.length; ly++) {
    for (let lx = 0; lx < STARTER_GROUND[ly]!.length; lx++) {
      if (STARTER_GROUND[ly]![lx] === "S") {
        out.push({ gridX: MAP_ORIGIN_X + lx, gridY: MAP_ORIGIN_Y + ly });
      }
    }
  }
  return out;
}
