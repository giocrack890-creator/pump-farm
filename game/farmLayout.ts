export type GroundCell = "G" | "S" | "P" | "L" | "W" | "B";
export type PropCell = "." | "F" | "H" | "K" | "E" | "C";

export const BLUEPRINT_ORIGIN_X = -3;
export const BLUEPRINT_ORIGIN_Y = -2;

export const STARTER_GROUND: GroundCell[][] = [
  ["L", "L", "L", "G", "B", "B", "G", "L", "L", "L"],
  ["L", "L", "G", "P", "B", "B", "P", "G", "L", "L"],
  ["L", "G", "P", "S", "S", "S", "P", "G", "G", "L"],
  ["L", "G", "P", "S", "S", "S", "P", "G", "W", "L"],
  ["L", "G", "P", "S", "S", "S", "P", "G", "W", "L"],
  ["L", "G", "G", "P", "P", "P", "G", "G", "G", "L"],
  ["L", "L", "G", "G", "G", "G", "G", "G", "L", "L"],
];

export const STARTER_PROPS: PropCell[][] = [
  [".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
  [".", ".", "F", ".", ".", ".", ".", "H", ".", "."],
  [".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
  [".", "K", ".", ".", ".", ".", ".", "F", ".", "."],
  [".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
  [".", ".", "H", ".", "C", ".", ".", ".", ".", "E"],
  [".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
];

export function groundAt(gridX: number, gridY: number): GroundCell {
  const lx = gridX - BLUEPRINT_ORIGIN_X;
  const ly = gridY - BLUEPRINT_ORIGIN_Y;
  if (ly < 0 || lx < 0 || ly >= STARTER_GROUND.length || lx >= STARTER_GROUND[0].length) {
    return "L";
  }
  return STARTER_GROUND[ly][lx];
}

export function propAt(gridX: number, gridY: number): PropCell {
  const lx = gridX - BLUEPRINT_ORIGIN_X;
  const ly = gridY - BLUEPRINT_ORIGIN_Y;
  if (ly < 0 || lx < 0 || ly >= STARTER_PROPS.length || lx >= STARTER_PROPS[0].length) {
    return ".";
  }
  return STARTER_PROPS[ly][lx];
}

export function blueprintBounds() {
  return {
    minX: BLUEPRINT_ORIGIN_X,
    minY: BLUEPRINT_ORIGIN_Y,
    maxX: BLUEPRINT_ORIGIN_X + STARTER_GROUND[0].length - 1,
    maxY: BLUEPRINT_ORIGIN_Y + STARTER_GROUND.length - 1,
  };
}
