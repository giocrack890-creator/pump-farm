/**
 * Starter farm centered in a large grass world (pan + zoom).
 *
 * Layout target (reference screenshot):
 * - Barn centered just north of the 3×3 field
 * - Silo tight to the barn's right
 * - No farmhouse in the yard cluster
 */

export const TILE_SIZE = 32;
export const MAP_WIDTH = 48;
export const MAP_HEIGHT = 40;
export const FARM_ORIGIN = { x: 16, y: 12 };

export const ACTIVE_BOUNDS = {
  minX: 16,
  minY: 12,
  maxX: 31,
  maxY: 27,
};

/** Master switch for barn/silo sprites. */
export const SHOW_BUILDINGS = true;
/** Farmhouse is not in the target yard layout. */
export const SHOW_FARMHOUSE = false;

/**
 * Building footprints — tile coords (fractional OK).
 * Feet = bottom-center of sprite.
 * Field occupies tiles (22–24, 20–22); barn sits just above y=19 fence line.
 */
export const FARMHOUSE_POS = { x: 18.5, y: 16.5 }; // unused while SHOW_FARMHOUSE=false
export const BARN_POS = { x: 23.0, y: 18.55 };
/** Nudged right so silo clears the wider barn. */
export const SILO_POS = { x: 25.95, y: 18.75 };

/** Feet-center pixel from tile coords (matches Phaser origin 0.5,1). */
export function buildingFeetPixel(pos: { x: number; y: number }) {
  return {
    x: pos.x * TILE_SIZE,
    y: pos.y * TILE_SIZE,
  };
}

export const SOIL_CELLS: { gridX: number; gridY: number }[] = [
  { gridX: 22, gridY: 20 },
  { gridX: 23, gridY: 20 },
  { gridX: 24, gridY: 20 },
  { gridX: 22, gridY: 21 },
  { gridX: 23, gridY: 21 },
  { gridX: 24, gridY: 21 },
  { gridX: 22, gridY: 22 },
  { gridX: 23, gridY: 22 },
  { gridX: 24, gridY: 22 },
];

export function soilCells(): { gridX: number; gridY: number }[] {
  return SOIL_CELLS.map((c) => ({ ...c }));
}

export function mapPixelSize() {
  return { width: MAP_WIDTH * TILE_SIZE, height: MAP_HEIGHT * TILE_SIZE };
}

export function farmCenterPixel() {
  const soils = SOIL_CELLS;
  const cx = (soils[0].gridX + soils[soils.length - 1].gridX) / 2;
  const cy = (soils[0].gridY + soils[soils.length - 1].gridY) / 2;
  return {
    x: (cx + 0.5) * TILE_SIZE,
    y: (cy + 0.5) * TILE_SIZE,
  };
}

export function isUnclaimed(gridX: number, gridY: number): boolean {
  return (
    gridX < ACTIVE_BOUNDS.minX ||
    gridX > ACTIVE_BOUNDS.maxX ||
    gridY < ACTIVE_BOUNDS.minY ||
    gridY > ACTIVE_BOUNDS.maxY
  );
}
