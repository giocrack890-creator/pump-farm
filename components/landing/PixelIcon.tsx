"use client";

/**
 * PixelIcon — single source of truth for landing pixel chrome icons.
 *
 * SOURCE NOTE (2026-09-10):
 * The published kit at https://claude.ai/code/artifact/259b2249-7ef6-4dd3-986d-4f1fc1c95c50
 * was unreachable (Cloudflare 403 / empty fetch). No in-repo copy of PAL / d* drawers
 * existed. These are kit-faithful recreations: same id names, 16×16 pixel farm icons,
 * wood/gold/parchment palette matching landing + HUD. Do not add per-section SVGs —
 * extend this file only.
 */

import { useEffect, useRef } from "react";

/** Landing / kit palette — wood-dark, gold, parchment language. */
export const PAL = {
  wood: "#5b3c23",
  woodMid: "#8a5f36",
  woodLite: "#a67c45",
  parchment: "#f6ecd4",
  cream: "#fbf3e0",
  card: "#fff8eb",
  gold: "#d69a2d",
  goldLite: "#f0c45a",
  goldDeep: "#a87018",
  green: "#5c8a3a",
  greenDark: "#3d5c28",
  greenLite: "#8bb85a",
  red: "#a8433a",
  blue: "#4a7fae",
  ink: "#3a2414",
  silver: "#9aa0a8",
  silverLite: "#c8ccd2",
  bronze: "#9a6430",
  bronzeLite: "#c48848",
  white: "#fffdf6",
  black: "#1a1008",
  flame: "#e8782a",
  flameLite: "#f4c84a",
  soil: "#6b4a2e",
  soilLite: "#8a6a48",
  lock: "#6b5a48",
} as const;

type Color = string;

export type PixelIconId =
  | "seed_basic"
  | "seed_hybrid"
  | "seed_golden"
  | "seed_mythic"
  | "crop_wheat_1"
  | "crop_wheat_4"
  | "rank_gold"
  | "rank_silver"
  | "rank_bronze"
  | "rank_crown"
  | "xp_star"
  | "building_silo"
  | "building_farmhouse"
  | "building_greenhouse"
  | "animal_farmer"
  | "animal_chicken"
  | "coin_farm"
  | "status_check"
  | "status_unlock"
  | "status_clock"
  | "status_lock"
  | "status_flame"
  | "chrome_progress_filled";

type DrawFn = (ctx: CanvasRenderingContext2D, s: number) => void;

function px(ctx: CanvasRenderingContext2D, x: number, y: number, c: Color, s: number) {
  ctx.fillStyle = c;
  ctx.fillRect(x * s, y * s, s, s);
}

function rect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  c: Color,
  s: number,
) {
  ctx.fillStyle = c;
  ctx.fillRect(x * s, y * s, w * s, h * s);
}

/** Seed packet — brown pouch + sprout tip tinted by tier. */
function dSeed(
  ctx: CanvasRenderingContext2D,
  s: number,
  sprout: Color,
  accent: Color,
) {
  rect(ctx, 5, 9, 6, 5, PAL.wood, s);
  rect(ctx, 6, 8, 4, 1, PAL.woodMid, s);
  rect(ctx, 6, 10, 4, 3, PAL.parchment, s);
  px(ctx, 7, 11, accent, s);
  px(ctx, 8, 11, accent, s);
  // sprout
  px(ctx, 7, 6, sprout, s);
  px(ctx, 8, 5, sprout, s);
  px(ctx, 9, 6, sprout, s);
  px(ctx, 8, 7, PAL.greenDark, s);
}

function dSeedBasic(ctx: CanvasRenderingContext2D, s: number) {
  dSeed(ctx, s, PAL.greenLite, PAL.green);
}
function dSeedHybrid(ctx: CanvasRenderingContext2D, s: number) {
  dSeed(ctx, s, PAL.blue, PAL.blue);
}
function dSeedGolden(ctx: CanvasRenderingContext2D, s: number) {
  dSeed(ctx, s, PAL.goldLite, PAL.gold);
}
function dSeedMythic(ctx: CanvasRenderingContext2D, s: number) {
  dSeed(ctx, s, "#c47aff", "#9b4de0");
}

/** Young wheat sprout. */
function dCropWheat1(ctx: CanvasRenderingContext2D, s: number) {
  rect(ctx, 4, 13, 8, 2, PAL.soil, s);
  px(ctx, 7, 11, PAL.greenDark, s);
  px(ctx, 8, 10, PAL.green, s);
  px(ctx, 7, 9, PAL.greenLite, s);
  px(ctx, 8, 8, PAL.green, s);
  px(ctx, 6, 9, PAL.greenLite, s);
  px(ctx, 9, 9, PAL.greenLite, s);
}

/** Ready wheat — full head. */
function dCropWheat4(ctx: CanvasRenderingContext2D, s: number) {
  rect(ctx, 3, 14, 10, 1, PAL.soil, s);
  rect(ctx, 7, 8, 2, 6, PAL.greenDark, s);
  // heads
  for (const [x, y] of [
    [5, 5],
    [6, 4],
    [7, 3],
    [8, 3],
    [9, 4],
    [10, 5],
    [6, 6],
    [7, 5],
    [8, 5],
    [9, 6],
  ] as const) {
    px(ctx, x, y, PAL.gold, s);
  }
  px(ctx, 7, 4, PAL.goldLite, s);
  px(ctx, 8, 4, PAL.goldLite, s);
}

function dMedal(
  ctx: CanvasRenderingContext2D,
  s: number,
  rim: Color,
  face: Color,
  highlight: Color,
) {
  // ribbon
  rect(ctx, 5, 1, 2, 4, PAL.red, s);
  rect(ctx, 9, 1, 2, 4, PAL.red, s);
  px(ctx, 7, 3, PAL.red, s);
  px(ctx, 8, 3, PAL.red, s);
  // medal disc
  rect(ctx, 4, 5, 8, 8, rim, s);
  rect(ctx, 5, 6, 6, 6, face, s);
  px(ctx, 6, 7, highlight, s);
  px(ctx, 7, 8, PAL.ink, s);
  px(ctx, 8, 8, PAL.ink, s);
  px(ctx, 7, 9, PAL.ink, s);
}

function dRankGold(ctx: CanvasRenderingContext2D, s: number) {
  dMedal(ctx, s, PAL.goldDeep, PAL.gold, PAL.goldLite);
}
function dRankSilver(ctx: CanvasRenderingContext2D, s: number) {
  dMedal(ctx, s, "#6e747c", PAL.silver, PAL.silverLite);
}
function dRankBronze(ctx: CanvasRenderingContext2D, s: number) {
  dMedal(ctx, s, "#6e4520", PAL.bronze, PAL.bronzeLite);
}

function dRankCrown(ctx: CanvasRenderingContext2D, s: number) {
  rect(ctx, 3, 10, 10, 3, PAL.goldDeep, s);
  rect(ctx, 4, 9, 8, 1, PAL.gold, s);
  // peaks
  px(ctx, 4, 6, PAL.gold, s);
  px(ctx, 5, 5, PAL.goldLite, s);
  px(ctx, 5, 6, PAL.gold, s);
  px(ctx, 5, 7, PAL.gold, s);
  px(ctx, 7, 4, PAL.goldLite, s);
  px(ctx, 7, 5, PAL.gold, s);
  px(ctx, 7, 6, PAL.gold, s);
  px(ctx, 7, 7, PAL.gold, s);
  px(ctx, 9, 5, PAL.goldLite, s);
  px(ctx, 9, 6, PAL.gold, s);
  px(ctx, 9, 7, PAL.gold, s);
  px(ctx, 10, 6, PAL.gold, s);
  px(ctx, 11, 6, PAL.gold, s);
  // jewels
  px(ctx, 5, 8, PAL.red, s);
  px(ctx, 7, 8, PAL.blue, s);
  px(ctx, 9, 8, PAL.green, s);
  rect(ctx, 4, 13, 8, 1, PAL.goldLite, s);
}

function dXpStar(ctx: CanvasRenderingContext2D, s: number) {
  // 5-point-ish star on 16 grid
  const pts: [number, number][] = [
    [7, 2],
    [8, 2],
    [7, 3],
    [8, 3],
    [6, 5],
    [9, 5],
    [3, 6],
    [4, 6],
    [11, 6],
    [12, 6],
    [5, 7],
    [6, 7],
    [9, 7],
    [10, 7],
    [6, 8],
    [7, 8],
    [8, 8],
    [9, 8],
    [5, 10],
    [6, 9],
    [9, 9],
    [10, 10],
    [6, 11],
    [7, 12],
    [8, 12],
    [9, 11],
  ];
  for (const [x, y] of pts) px(ctx, x, y, PAL.gold, s);
  px(ctx, 7, 6, PAL.goldLite, s);
  px(ctx, 8, 6, PAL.goldLite, s);
  px(ctx, 7, 7, PAL.goldLite, s);
}

function dBuildingSilo(ctx: CanvasRenderingContext2D, s: number) {
  // dome
  rect(ctx, 5, 2, 6, 2, PAL.silver, s);
  rect(ctx, 4, 4, 8, 1, PAL.silverLite, s);
  // body
  rect(ctx, 4, 5, 8, 9, PAL.woodMid, s);
  rect(ctx, 5, 5, 6, 9, PAL.woodLite, s);
  // bands
  rect(ctx, 4, 7, 8, 1, PAL.wood, s);
  rect(ctx, 4, 10, 8, 1, PAL.wood, s);
  // door
  rect(ctx, 7, 11, 2, 3, PAL.ink, s);
  // ground
  rect(ctx, 3, 14, 10, 1, PAL.soil, s);
}

function dBuildingFarmhouse(ctx: CanvasRenderingContext2D, s: number) {
  // roof
  for (let i = 0; i < 5; i++) {
    rect(ctx, 3 + i, 3 + i, 10 - i * 2, 1, PAL.red, s);
  }
  rect(ctx, 4, 7, 8, 7, PAL.parchment, s);
  rect(ctx, 4, 7, 8, 1, PAL.wood, s);
  // door + window
  rect(ctx, 7, 10, 2, 4, PAL.wood, s);
  rect(ctx, 5, 9, 2, 2, PAL.blue, s);
  rect(ctx, 9, 9, 2, 2, PAL.blue, s);
  rect(ctx, 3, 14, 10, 1, PAL.soil, s);
}

function dBuildingGreenhouse(ctx: CanvasRenderingContext2D, s: number) {
  // arched glass roof
  rect(ctx, 4, 3, 8, 2, PAL.greenLite, s);
  rect(ctx, 3, 5, 10, 1, PAL.green, s);
  rect(ctx, 3, 6, 10, 8, "#c8e8b0", s);
  // panes
  rect(ctx, 5, 7, 1, 6, PAL.green, s);
  rect(ctx, 8, 7, 1, 6, PAL.green, s);
  rect(ctx, 10, 7, 1, 6, PAL.green, s);
  rect(ctx, 3, 9, 10, 1, PAL.green, s);
  // plants inside
  px(ctx, 6, 11, PAL.greenDark, s);
  px(ctx, 9, 12, PAL.greenDark, s);
  rect(ctx, 2, 14, 12, 1, PAL.soil, s);
}

function dAnimalFarmer(ctx: CanvasRenderingContext2D, s: number) {
  // hat
  rect(ctx, 5, 2, 6, 2, PAL.wood, s);
  rect(ctx, 4, 3, 8, 1, PAL.woodMid, s);
  // head
  rect(ctx, 6, 4, 4, 3, "#e8c090", s);
  // body overalls
  rect(ctx, 5, 7, 6, 5, PAL.blue, s);
  rect(ctx, 6, 7, 4, 2, PAL.parchment, s);
  // arms / legs
  px(ctx, 4, 8, "#e8c090", s);
  px(ctx, 11, 8, "#e8c090", s);
  rect(ctx, 6, 12, 2, 2, PAL.wood, s);
  rect(ctx, 8, 12, 2, 2, PAL.wood, s);
}

function dAnimalChicken(ctx: CanvasRenderingContext2D, s: number) {
  // body
  rect(ctx, 5, 7, 6, 5, PAL.white, s);
  rect(ctx, 4, 8, 1, 3, PAL.white, s);
  // head
  rect(ctx, 9, 4, 4, 4, PAL.white, s);
  px(ctx, 11, 5, PAL.ink, s);
  // comb + beak
  px(ctx, 10, 3, PAL.red, s);
  px(ctx, 11, 3, PAL.red, s);
  px(ctx, 13, 5, PAL.gold, s);
  // feet
  px(ctx, 6, 12, PAL.gold, s);
  px(ctx, 9, 12, PAL.gold, s);
  rect(ctx, 5, 13, 2, 1, PAL.gold, s);
  rect(ctx, 8, 13, 2, 1, PAL.gold, s);
}

function dCoinFarm(ctx: CanvasRenderingContext2D, s: number) {
  rect(ctx, 3, 3, 10, 10, PAL.goldDeep, s);
  rect(ctx, 4, 2, 8, 12, PAL.goldDeep, s);
  rect(ctx, 2, 4, 12, 8, PAL.goldDeep, s);
  rect(ctx, 4, 4, 8, 8, PAL.gold, s);
  rect(ctx, 5, 3, 6, 10, PAL.gold, s);
  rect(ctx, 3, 5, 10, 6, PAL.gold, s);
  // $
  rect(ctx, 7, 5, 2, 6, PAL.goldDeep, s);
  rect(ctx, 6, 6, 4, 1, PAL.goldDeep, s);
  rect(ctx, 6, 9, 4, 1, PAL.goldDeep, s);
  px(ctx, 5, 5, PAL.goldLite, s);
}

function dStatusCheck(ctx: CanvasRenderingContext2D, s: number) {
  // circle
  rect(ctx, 3, 3, 10, 10, PAL.greenDark, s);
  rect(ctx, 4, 2, 8, 12, PAL.greenDark, s);
  rect(ctx, 2, 4, 12, 8, PAL.greenDark, s);
  rect(ctx, 4, 4, 8, 8, PAL.green, s);
  // check
  px(ctx, 5, 8, PAL.white, s);
  px(ctx, 6, 9, PAL.white, s);
  px(ctx, 7, 10, PAL.white, s);
  px(ctx, 8, 9, PAL.white, s);
  px(ctx, 9, 8, PAL.white, s);
  px(ctx, 10, 7, PAL.white, s);
  px(ctx, 11, 6, PAL.white, s);
}

function dStatusUnlock(ctx: CanvasRenderingContext2D, s: number) {
  // open padlock
  rect(ctx, 5, 3, 2, 4, PAL.silver, s);
  rect(ctx, 9, 3, 2, 2, PAL.silver, s);
  rect(ctx, 7, 2, 3, 1, PAL.silver, s);
  rect(ctx, 4, 7, 8, 6, PAL.gold, s);
  rect(ctx, 5, 8, 6, 4, PAL.goldLite, s);
  px(ctx, 7, 9, PAL.ink, s);
  px(ctx, 7, 10, PAL.ink, s);
}

function dStatusClock(ctx: CanvasRenderingContext2D, s: number) {
  rect(ctx, 3, 3, 10, 10, PAL.wood, s);
  rect(ctx, 4, 2, 8, 12, PAL.wood, s);
  rect(ctx, 2, 4, 12, 8, PAL.wood, s);
  rect(ctx, 4, 4, 8, 8, PAL.parchment, s);
  // hands
  rect(ctx, 7, 5, 2, 4, PAL.ink, s);
  rect(ctx, 8, 8, 3, 2, PAL.ink, s);
  px(ctx, 7, 4, PAL.gold, s);
}

function dStatusLock(ctx: CanvasRenderingContext2D, s: number) {
  rect(ctx, 5, 3, 6, 1, PAL.lock, s);
  rect(ctx, 5, 4, 2, 4, PAL.lock, s);
  rect(ctx, 9, 4, 2, 4, PAL.lock, s);
  rect(ctx, 4, 7, 8, 6, PAL.woodMid, s);
  rect(ctx, 5, 8, 6, 4, PAL.woodLite, s);
  px(ctx, 7, 9, PAL.ink, s);
  px(ctx, 7, 10, PAL.ink, s);
  px(ctx, 8, 10, PAL.ink, s);
}

function dStatusFlame(ctx: CanvasRenderingContext2D, s: number) {
  const pts: [number, number, Color][] = [
    [7, 2, PAL.flameLite],
    [8, 3, PAL.flameLite],
    [6, 4, PAL.flame],
    [7, 4, PAL.flameLite],
    [8, 4, PAL.flame],
    [5, 5, PAL.flame],
    [6, 5, PAL.flameLite],
    [7, 5, PAL.goldLite],
    [8, 5, PAL.flameLite],
    [9, 5, PAL.flame],
    [5, 6, PAL.flame],
    [6, 6, PAL.goldLite],
    [7, 6, PAL.white],
    [8, 6, PAL.goldLite],
    [9, 6, PAL.flame],
    [5, 7, PAL.flame],
    [6, 7, PAL.flameLite],
    [7, 7, PAL.goldLite],
    [8, 7, PAL.flameLite],
    [9, 7, PAL.flame],
    [6, 8, PAL.flame],
    [7, 8, PAL.flameLite],
    [8, 8, PAL.flame],
    [6, 9, PAL.flame],
    [7, 9, PAL.flame],
    [8, 9, PAL.flame],
    [7, 10, PAL.goldDeep],
  ];
  for (const [x, y, c] of pts) px(ctx, x, y, c, s);
}

/** Reference chrome for progress fill — wood bevel strip. */
function dChromeProgressFilled(ctx: CanvasRenderingContext2D, s: number) {
  rect(ctx, 1, 5, 14, 6, PAL.wood, s);
  rect(ctx, 2, 6, 12, 4, PAL.green, s);
  rect(ctx, 2, 6, 12, 1, PAL.greenLite, s);
  rect(ctx, 2, 9, 12, 1, PAL.greenDark, s);
  px(ctx, 3, 7, PAL.greenLite, s);
}

const DRAWERS: Record<PixelIconId, DrawFn> = {
  seed_basic: dSeedBasic,
  seed_hybrid: dSeedHybrid,
  seed_golden: dSeedGolden,
  seed_mythic: dSeedMythic,
  crop_wheat_1: dCropWheat1,
  crop_wheat_4: dCropWheat4,
  rank_gold: dRankGold,
  rank_silver: dRankSilver,
  rank_bronze: dRankBronze,
  rank_crown: dRankCrown,
  xp_star: dXpStar,
  building_silo: dBuildingSilo,
  building_farmhouse: dBuildingFarmhouse,
  building_greenhouse: dBuildingGreenhouse,
  animal_farmer: dAnimalFarmer,
  animal_chicken: dAnimalChicken,
  coin_farm: dCoinFarm,
  status_check: dStatusCheck,
  status_unlock: dStatusUnlock,
  status_clock: dStatusClock,
  status_lock: dStatusLock,
  status_flame: dStatusFlame,
  chrome_progress_filled: dChromeProgressFilled,
};

const GRID = 16;

export function PixelIcon({
  id,
  size = 32,
  className,
  title,
}: {
  id: PixelIconId;
  size?: number;
  className?: string;
  title?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    const cell = size / GRID;
    DRAWERS[id](ctx, cell);
  }, [id, size]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
    />
  );
}

/** Wood medallion frame for How-it-works step icons. */
export function PixelMedallion({
  id,
  size = 28,
}: {
  id: PixelIconId;
  size?: number;
}) {
  return (
    <span className="pf-medallion" aria-hidden>
      <PixelIcon id={id} size={size} />
    </span>
  );
}
