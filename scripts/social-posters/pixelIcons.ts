/**
 * Kit-faithful pixel icon drawers — same 16×16 grids as
 * `components/landing/PixelIcon.tsx` (coin_farm, rank_gold, rank_crown).
 * Renders to raw RGBA for sharp compositing (nearest-neighbor safe).
 */
import sharp from "sharp";
import { PAL, hexToRgba } from "./palette";

const GRID = 16;

type Color = string;

function paint(
  buf: Buffer,
  size: number,
  cell: number,
  x: number,
  y: number,
  w: number,
  h: number,
  c: Color,
) {
  const [r, g, b, a] = hexToRgba(c);
  const px0 = Math.floor(x * cell);
  const py0 = Math.floor(y * cell);
  const pw = Math.ceil(w * cell);
  const ph = Math.ceil(h * cell);
  for (let dy = 0; dy < ph; dy++) {
    for (let dx = 0; dx < pw; dx++) {
      const px = px0 + dx;
      const py = py0 + dy;
      if (px < 0 || py < 0 || px >= size || py >= size) continue;
      const i = (py * size + px) * 4;
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = a;
    }
  }
}

function px(buf: Buffer, size: number, cell: number, x: number, y: number, c: Color) {
  paint(buf, size, cell, x, y, 1, 1, c);
}

function rect(
  buf: Buffer,
  size: number,
  cell: number,
  x: number,
  y: number,
  w: number,
  h: number,
  c: Color,
) {
  paint(buf, size, cell, x, y, w, h, c);
}

function dCoinFarm(buf: Buffer, size: number, cell: number) {
  rect(buf, size, cell, 3, 3, 10, 10, PAL.goldDeep);
  rect(buf, size, cell, 4, 2, 8, 12, PAL.goldDeep);
  rect(buf, size, cell, 2, 4, 12, 8, PAL.goldDeep);
  rect(buf, size, cell, 4, 4, 8, 8, PAL.gold);
  rect(buf, size, cell, 5, 3, 6, 10, PAL.gold);
  rect(buf, size, cell, 3, 5, 10, 6, PAL.gold);
  rect(buf, size, cell, 7, 5, 2, 6, PAL.goldDeep);
  rect(buf, size, cell, 6, 6, 4, 1, PAL.goldDeep);
  rect(buf, size, cell, 6, 9, 4, 1, PAL.goldDeep);
  px(buf, size, cell, 5, 5, PAL.goldLite);
}

function dMedal(
  buf: Buffer,
  size: number,
  cell: number,
  rim: Color,
  face: Color,
  highlight: Color,
) {
  rect(buf, size, cell, 6, 2, 4, 2, PAL.red);
  px(buf, size, cell, 7, 1, PAL.red);
  px(buf, size, cell, 8, 1, PAL.red);
  px(buf, size, cell, 7, 3, PAL.red);
  px(buf, size, cell, 8, 3, PAL.red);
  rect(buf, size, cell, 4, 5, 8, 8, rim);
  rect(buf, size, cell, 5, 6, 6, 6, face);
  px(buf, size, cell, 6, 7, highlight);
  px(buf, size, cell, 7, 8, PAL.ink);
  px(buf, size, cell, 8, 8, PAL.ink);
  px(buf, size, cell, 7, 9, PAL.ink);
}

function dRankGold(buf: Buffer, size: number, cell: number) {
  dMedal(buf, size, cell, PAL.goldDeep, PAL.gold, PAL.goldLite);
}

function dRankCrown(buf: Buffer, size: number, cell: number) {
  rect(buf, size, cell, 3, 10, 10, 3, PAL.goldDeep);
  rect(buf, size, cell, 4, 9, 8, 1, PAL.gold);
  px(buf, size, cell, 4, 6, PAL.gold);
  px(buf, size, cell, 5, 5, PAL.goldLite);
  px(buf, size, cell, 5, 6, PAL.gold);
  px(buf, size, cell, 5, 7, PAL.gold);
  px(buf, size, cell, 7, 4, PAL.goldLite);
  px(buf, size, cell, 7, 5, PAL.gold);
  px(buf, size, cell, 7, 6, PAL.gold);
  px(buf, size, cell, 7, 7, PAL.gold);
  px(buf, size, cell, 9, 5, PAL.goldLite);
  px(buf, size, cell, 9, 6, PAL.gold);
  px(buf, size, cell, 9, 7, PAL.gold);
  px(buf, size, cell, 10, 6, PAL.gold);
  px(buf, size, cell, 11, 6, PAL.gold);
  px(buf, size, cell, 5, 8, PAL.red);
  px(buf, size, cell, 7, 8, PAL.blue);
  px(buf, size, cell, 9, 8, PAL.green);
  rect(buf, size, cell, 4, 13, 8, 1, PAL.goldLite);
}

export type KitIconId = "coin_farm" | "rank_gold" | "rank_crown";

const DRAWERS: Record<KitIconId, (buf: Buffer, size: number, cell: number) => void> = {
  coin_farm: dCoinFarm,
  rank_gold: dRankGold,
  rank_crown: dRankCrown,
};

/** Render a kit icon at integer pixel scale (cell size). Output = 16*cell square PNG. */
export async function renderKitIcon(id: KitIconId, cell = 8): Promise<Buffer> {
  const size = GRID * cell;
  const buf = Buffer.alloc(size * size * 4);
  DRAWERS[id](buf, size, cell);
  return sharp(buf, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
}
