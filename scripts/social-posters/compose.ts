import sharp from "sharp";
import { ASSETS } from "./paths";
import { hexToRgba } from "./palette";

export type Layer = {
  input: Buffer;
  left: number;
  top: number;
};

/** Solid fill PNG. */
export async function solidPng(w: number, h: number, hex: string, alpha = 1): Promise<Buffer> {
  const [r, g, b] = hexToRgba(hex);
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  return sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: { r, g, b, alpha: a / 255 },
    },
  })
    .png()
    .toBuffer();
}

/** Crop a frame from a spritesheet (integer pixel box). */
export async function extractFrame(
  sheetPath: string,
  frameW: number,
  frameH: number,
  col: number,
  row: number,
): Promise<Buffer> {
  return sharp(sheetPath)
    .extract({
      left: col * frameW,
      top: row * frameH,
      width: frameW,
      height: frameH,
    })
    .ensureAlpha()
    .png()
    .toBuffer();
}

/**
 * Scale pixel art by a whole integer factor with nearest-neighbor.
 * Throws if factor is not a positive integer.
 */
export async function scaleNearest(input: Buffer | string, factor: number): Promise<Buffer> {
  if (!Number.isInteger(factor) || factor < 1) {
    throw new Error(`Pixel-art scale must be a positive integer, got ${factor}`);
  }
  const meta = await sharp(input).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) throw new Error("Cannot scale empty image");
  return sharp(input)
    .resize(w * factor, h * factor, { kernel: "nearest" })
    .png()
    .toBuffer();
}

/** Scale to exact pixel size using nearest-neighbor (size must be integer multiple of native). */
export async function scaleToNearest(
  input: Buffer | string,
  targetW: number,
  targetH?: number,
): Promise<Buffer> {
  const meta = await sharp(input).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) throw new Error("Cannot scale empty image");
  const th = targetH ?? Math.round((targetW / w) * h);
  if (targetW % w !== 0 || th % h !== 0) {
    // Still use nearest, but warn via throw for non-integer factors when possible
    const fx = targetW / w;
    const fy = th / h;
    if (!Number.isInteger(fx) || !Number.isInteger(fy) || fx !== fy) {
      throw new Error(
        `Non-integer pixel scale ${fx.toFixed(3)}×${fy.toFixed(3)} (native ${w}×${h} → ${targetW}×${th})`,
      );
    }
  }
  return sharp(input)
    .resize(targetW, th, { kernel: "nearest" })
    .png()
    .toBuffer();
}

/** Rotate with transparent fill — for coin scatter variety. */
export async function rotateSprite(input: Buffer, degrees: number): Promise<Buffer> {
  return sharp(input)
    .rotate(degrees, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

/** Composite layers onto a base buffer. */
export async function stack(base: Buffer, layers: Layer[]): Promise<Buffer> {
  if (layers.length === 0) return base;
  return sharp(base)
    .composite(layers.map((l) => ({ input: l.input, left: l.left, top: l.top })))
    .png()
    .toBuffer();
}

/** Darken + slight blur for soft background plates (non-sprite atmosphere only). */
export async function softBgPlate(
  src: string,
  w: number,
  h: number,
  darken = 0.45,
): Promise<Buffer> {
  const blurred = await sharp(src)
    .resize(w, h, { fit: "cover" })
    .blur(8)
    .modulate({ brightness: darken })
    .png()
    .toBuffer();
  return blurred;
}

/** Tile a scaled sprite across a region (integer nearest-neighbor tiles). */
async function tileRegion(
  tileBuf: Buffer,
  regionW: number,
  regionH: number,
): Promise<Buffer> {
  const meta = await sharp(tileBuf).metadata();
  const tw = meta.width!;
  const th = meta.height!;
  const cols = Math.ceil(regionW / tw);
  const rows = Math.ceil(regionH / th);
  const layers: Layer[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      layers.push({ input: tileBuf, left: c * tw, top: r * th });
    }
  }
  const canvas = await solidPng(cols * tw, rows * th, "#000000", 0);
  const filled = await stack(canvas, layers);
  return sharp(filled)
    .extract({ left: 0, top: 0, width: regionW, height: regionH })
    .png()
    .toBuffer();
}

/**
 * Clean farm backdrop — readable game scene, soft treatment.
 * Soft blue→gold sky (landing palette), light blur, gentle shade.
 * Horizon ~70% so foreground characters stand on land.
 */
export async function farmSceneBg(W: number, H: number): Promise<Buffer> {
  const horizon = Math.round(H * 0.7);
  const groundH = H - horizon;
  const grassScale = 4;

  const skySvg = `<svg width="${W}" height="${horizon}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4a7fae"/>
      <stop offset="42%" stop-color="#e8a04a"/>
      <stop offset="78%" stop-color="#f4c84a"/>
      <stop offset="100%" stop-color="#f7e08a"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${horizon}" fill="url(#sky)"/>
  <circle cx="${Math.round(W * 0.82)}" cy="${Math.round(horizon * 0.55)}" r="${Math.round(H * 0.08)}" fill="#ffe9a0" opacity="0.9"/>
</svg>`;

  let scene = await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: { r: 92, g: 138, b: 58, alpha: 1 },
    },
  })
    .composite([{ input: Buffer.from(skySvg), left: 0, top: 0 }])
    .png()
    .toBuffer();

  const grass = await scaleNearest(ASSETS.tileGrass, grassScale);
  scene = await stack(scene, [
    { input: await tileRegion(grass, W, groundH), left: 0, top: horizon },
  ]);

  const dirt = await scaleNearest(ASSETS.tileDirt, grassScale);
  scene = await stack(scene, [
    {
      input: await tileRegion(dirt, W, Math.min(groundH, grassScale * 32)),
      left: 0,
      top: horizon,
    },
  ]);

  const plot = await scaleNearest(ASSETS.plotSoil, grassScale);
  const fieldW = Math.round(W * 0.7);
  const fieldH = Math.round(groundH * 0.5);
  const fieldLeft = Math.round((W - fieldW) / 2);
  const fieldTop = horizon + Math.round(groundH * 0.14);
  scene = await stack(scene, [
    { input: await tileRegion(plot, fieldW, fieldH), left: fieldLeft, top: fieldTop },
  ]);

  const cropReady = await scaleNearest(ASSETS.wheatReady, 2);
  const cropGrow = await scaleNearest(ASSETS.wheatGrow, 2);
  const crops: Layer[] = [];
  for (let i = 0; i < 6; i++) {
    const c = i % 2 === 0 ? cropReady : cropGrow;
    const cm = await sharp(c).metadata();
    crops.push({
      input: c,
      left: fieldLeft + 60 + (i % 3) * Math.round(fieldW / 3.2),
      top: fieldTop + 24 + Math.floor(i / 3) * Math.round(fieldH / 2.2) - (cm.height ?? 0) + 8,
    });
  }
  scene = await stack(scene, crops);

  const fence = await scaleNearest(ASSETS.fenceH, 3);
  const fenceRow = await tileRegion(fence, W, (await sharp(fence).metadata()).height!);
  const fH = (await sharp(fenceRow).metadata()).height ?? 32;
  scene = await stack(scene, [
    { input: fenceRow, left: 0, top: horizon - Math.round(fH * 0.5) },
  ]);

  const barn = await scaleNearest(ASSETS.barn, 3);
  const silo = await scaleNearest(ASSETS.silo, 3);
  const barnM = await sharp(barn).metadata();
  const siloM = await sharp(silo).metadata();
  const tree = await scaleNearest(ASSETS.tree, 2);
  const treeM = await sharp(tree).metadata();
  scene = await stack(scene, [
    { input: barn, left: Math.round(W * 0.05), top: horizon - (barnM.height ?? 0) + 10 },
    {
      input: silo,
      left: W - (siloM.width ?? 0) - Math.round(W * 0.04),
      top: horizon - (siloM.height ?? 0) + 6,
    },
    { input: tree, left: Math.round(W * 0.42), top: horizon - (treeM.height ?? 0) + 16 },
  ]);

  scene = await sharp(scene)
    .modulate({ brightness: 0.97, saturation: 1.06 })
    .blur(1.2)
    .png()
    .toBuffer();

  const shade = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="top" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3a2414" stop-opacity="0.32"/>
      <stop offset="26%" stop-color="#3a2414" stop-opacity="0"/>
      <stop offset="100%" stop-color="#3a2414" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="v" cx="50%" cy="48%" r="78%">
      <stop offset="62%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#3a2414" stop-opacity="0.22"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#top)"/>
  <rect width="${W}" height="${H}" fill="url(#v)"/>
</svg>`;
  return stack(scene, [{ input: Buffer.from(shade), left: 0, top: 0 }]);
}

/**
 * Wood-plank text plaque — mirrors landing wood / HUD chrome language
 * (wood-mid fill, wood-dark border, cream text). Uses SVG so sharp can rasterize.
 */
export function woodPlaqueSvg(opts: {
  text: string;
  width: number;
  height: number;
  fontSize: number;
  fill?: string;
  textColor?: string;
  border?: string;
}): string {
  const fill = opts.fill ?? "#8a5f36";
  const textColor = opts.textColor ?? "#fbf3e0";
  const border = opts.border ?? "#5b3c23";
  const escaped = opts.text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<svg width="${opts.width}" height="${opts.height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="3" width="${opts.width - 6}" height="${opts.height - 6}" rx="10" ry="10"
    fill="${fill}" stroke="${border}" stroke-width="6"/>
  <rect x="9" y="9" width="${opts.width - 18}" height="${opts.height - 18}" rx="6" ry="6"
    fill="none" stroke="#c9a46a" stroke-width="2" opacity="0.55"/>
  <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle"
    font-family="'Courier New', Courier, monospace" font-size="${opts.fontSize}"
    font-weight="800" letter-spacing="1.5" fill="${textColor}">${escaped}</text>
</svg>`;
}

export async function woodPlaque(opts: {
  text: string;
  width: number;
  height: number;
  fontSize: number;
  fill?: string;
  textColor?: string;
  border?: string;
}): Promise<Buffer> {
  return sharp(Buffer.from(woodPlaqueSvg(opts))).png().toBuffer();
}

/** Season Pot card — matches `PoolHudChip` colors/structure with real HUD icons. */
export async function seasonPotCard(opts: {
  width: number;
  height: number;
  potLabel: string;
  ethLabel: string;
  siloIcon: Buffer;
}): Promise<Buffer> {
  const { width, height, potLabel, ethLabel, siloIcon } = opts;
  const iconSize = 36;
  const icon = await sharp(siloIcon)
    .resize(iconSize, iconSize, { kernel: "nearest" })
    .png()
    .toBuffer();

  // Escape for SVG text content (not JS template — $ is fine, but & must be escaped)
  const safePot = potLabel.replace(/&/g, "&amp;");
  const safeEth = ethLabel.replace(/&/g, "&amp;");

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#1a2e12" stroke="#3d7a2e" stroke-width="6"/>
  <text x="64" y="40" font-family="'Courier New', Courier, monospace" font-size="20"
    font-weight="700" letter-spacing="2" fill="#9dffb8">SEASON POT</text>
  <text x="28" y="108" font-family="'Courier New', Courier, monospace" font-size="56"
    font-weight="800" fill="#7bb85c">${safePot}</text>
  <text x="28" y="${height - 28}" font-family="'Courier New', Courier, monospace" font-size="18"
    fill="#9dffb8" opacity="0.9">${safeEth} · paid out daily</text>
</svg>`;

  const base = await sharp(Buffer.from(svg)).png().toBuffer();
  return sharp(base)
    .composite([{ input: icon, left: 18, top: 16 }])
    .png()
    .toBuffer();
}

/** Income / idle rate pill chrome — HUD wood panel look. */
export async function incomePillCard(opts: {
  width: number;
  height: number;
  rateLabel: string;
  hypeIcon: Buffer;
}): Promise<Buffer> {
  const { width, height, rateLabel, hypeIcon } = opts;
  const icon = await sharp(hypeIcon)
    .resize(48, 48, { kernel: "nearest" })
    .png()
    .toBuffer();
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#c9a46a" stroke="#5c3a1e" stroke-width="6"/>
  <rect x="6" y="6" width="${width - 12}" height="${height - 12}" fill="none" stroke="#e8d09a" stroke-width="2"/>
  <text x="72" y="42" font-family="'Courier New', Courier, monospace" font-size="28"
    font-weight="800" fill="#1a5c30">${rateLabel.replace(/&/g, "&amp;")}</text>
  <text x="72" y="72" font-family="'Courier New', Courier, monospace" font-size="14"
    fill="#5c3a1e">Idle Hype · live rate</text>
</svg>`;
  const base = await sharp(Buffer.from(svg)).png().toBuffer();
  return sharp(base)
    .composite([{ input: icon, left: 14, top: Math.round((height - 48) / 2) }])
    .png()
    .toBuffer();
}

/** Deterministic PRNG for coin scatter (reproducible exports). */
export function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
