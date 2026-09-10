/**
 * Soil / plot anchors derived from the Tiled starter map (`public/assets/maps/starter_farm.json`).
 * Do not procedurally scatter — keep in sync with the authored map.
 */

export const TILE_SIZE = 32;
export const MAP_WIDTH = 24;
export const MAP_HEIGHT = 20;

/** Tillable soil cells (tile coords) — planting targets. */
export const SOIL_CELLS: { gridX: number; gridY: number }[] = [{"gridX": 14, "gridY": 11}, {"gridX": 15, "gridY": 11}, {"gridX": 16, "gridY": 11}, {"gridX": 14, "gridY": 12}, {"gridX": 15, "gridY": 12}, {"gridX": 16, "gridY": 12}, {"gridX": 14, "gridY": 13}, {"gridX": 15, "gridY": 13}, {"gridX": 16, "gridY": 13}];

export function soilCells(): { gridX: number; gridY: number }[] {
  return SOIL_CELLS.map((c) => ({ ...c }));
}

export function mapPixelSize() {
  return { width: MAP_WIDTH * TILE_SIZE, height: MAP_HEIGHT * TILE_SIZE };
}
