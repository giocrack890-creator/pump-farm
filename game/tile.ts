/** Orthogonal top-down grid helpers — VectoRaith 32×32 pack. */

export const TILE_SIZE = 32;

/** Integer camera zoom only (pixelArt). */
export function integerZoom(viewW: number, viewH: number, mapW: number, mapH: number): number {
  const zx = viewW / mapW;
  const zy = viewH / mapH;
  const z = Math.min(zx, zy);
  return Math.max(1, Math.floor(z));
}

export function gridToScreen(gridX: number, gridY: number): { x: number; y: number } {
  return {
    x: gridX * TILE_SIZE + TILE_SIZE / 2,
    y: gridY * TILE_SIZE + TILE_SIZE / 2,
  };
}

export function depthFromY(y: number, extra = 0): number {
  return y + extra;
}
