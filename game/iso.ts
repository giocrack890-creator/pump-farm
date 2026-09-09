/** Kenney Isometric Miniature Farm — floor unit 256×128 inside 256×512 sprites. */
export const TILE_WIDTH = 256;
export const TILE_HEIGHT = 128;

export function isoToScreen(gridX: number, gridY: number) {
  return {
    x: (gridX - gridY) * (TILE_WIDTH / 2),
    y: (gridX + gridY) * (TILE_HEIGHT / 2),
  };
}

export function isoDepth(gridX: number, gridY: number, layer = 0) {
  return (gridX + gridY) * 10 + layer;
}

export function grassVariant(gridX: number, gridY: number): "a" | "b" {
  const n = Math.abs((gridX * 73856093) ^ (gridY * 19349663)) >>> 0;
  return n % 2 === 0 ? "a" : "b";
}
