/** Stardew Valley–style orthogonal pixel grid. */

export const TILE_SIZE = 16;
export const PIXEL_SCALE = 4;
/** On-screen tile size (integer scale only). */
export const TILE_SCREEN = TILE_SIZE * PIXEL_SCALE;

export function gridToScreen(gridX: number, gridY: number) {
  return {
    x: gridX * TILE_SCREEN,
    y: gridY * TILE_SCREEN,
  };
}

export function screenToGrid(screenX: number, screenY: number) {
  return {
    gridX: Math.floor(screenX / TILE_SCREEN),
    gridY: Math.floor(screenY / TILE_SCREEN),
  };
}

export function depthFromY(screenY: number, layer = 0) {
  return screenY + layer;
}
