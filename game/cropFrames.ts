/**
 * Verified crop frame indices on `vectoraith_tileset_farmingsims_crops_32x32.png`
 * (16×16 frames of 32×32). Confirmed via public/.../crops/_contact_sheet.png.
 *
 * Sheet layout: each crop is 4 consecutive frames left→right
 * (seedling → growing → mature → ready).
 */
export const CROP_SHEET = {
  key: "crops_sheet",
  path: "/assets/sprites/farming-sim/tiles/crops.png",
  frameWidth: 32,
  frameHeight: 32,
  columns: 16,
  rows: 16,
} as const;

export type CropStage = "seedling" | "growing" | "mature" | "ready";

export type CropFrameSet = Record<CropStage, number>;

/** Launch crop → seed tier mapping. Indices visually confirmed. */
export const CROP_FRAMES = {
  /** Turnip — row 1, cols 0–3 → frames 16–19 */
  turnip: { seedling: 16, growing: 17, mature: 18, ready: 19 },
  /** Carrot — row 7, cols 0–3 → frames 112–115 */
  carrot: { seedling: 112, growing: 113, mature: 114, ready: 115 },
  /** Wheat — row 1, cols 8–11 → frames 24–27 */
  wheat: { seedling: 24, growing: 25, mature: 26, ready: 27 },
  /** Pumpkin-ish vine — row 9, cols 0–3 → frames 144–147 */
  pumpkin: { seedling: 144, growing: 145, mature: 146, ready: 147 },
} as const satisfies Record<string, CropFrameSet>;

export type LaunchCropId = keyof typeof CROP_FRAMES;

/** Map existing seed tiers to launch crop art. */
export const TIER_TO_CROP: Record<string, LaunchCropId> = {
  Basic: "turnip",
  Hybrid: "carrot",
  Golden: "wheat",
  Mythic: "pumpkin",
  basic: "turnip",
  hybrid: "carrot",
  golden: "wheat",
  mythic: "pumpkin",
};

export function cropFrameForTier(tier: string | null, stageIndex: 0 | 1 | 2 | 3): number {
  const crop = TIER_TO_CROP[tier ?? "Basic"] ?? "turnip";
  const stages: CropStage[] = ["seedling", "growing", "mature", "ready"];
  return CROP_FRAMES[crop][stages[stageIndex]!];
}

/** Dev sanity: true if frame pixels are ≥95% one flat color (wrong index / empty). */
export function isFlatFramePixels(
  data: Uint8ClampedArray | number[],
  sampleCount = 20,
): boolean {
  // Expect RGBA; sample evenly; treat near-transparent as skip
  const pixels: [number, number, number][] = [];
  const stride = Math.max(4, Math.floor(data.length / (sampleCount * 4)) * 4);
  for (let i = 0; i + 3 < data.length && pixels.length < sampleCount; i += stride) {
    const a = data[i + 3] ?? 0;
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    if (a < 20 || r + g + b < 30) continue;
    pixels.push([r, g, b]);
  }
  if (pixels.length < 5) return true; // mostly empty → treat as bad
  const [r0, g0, b0] = pixels[0]!;
  let same = 0;
  for (const [r, g, b] of pixels) {
    if (Math.abs(r - r0) + Math.abs(g - g0) + Math.abs(b - b0) < 30) same += 1;
  }
  return same / pixels.length >= 0.95;
}
