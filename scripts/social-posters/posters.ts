import sharp from "sharp";
import { ASSETS, FARMER_PLOW, FARMER_WALK } from "./paths";
import { PAL } from "./palette";
import { renderKitIcon } from "./pixelIcons";
import {
  extractFrame,
  mulberry32,
  rotateSprite,
  scaleNearest,
  seasonPotCard,
  solidPng,
  stack,
  woodPlaque,
  farmSceneBg,
  type Layer,
} from "./compose";
import type { PotSnapshot } from "./fetchPot";
import { formatEth, formatUsd } from "./fetchPot";

export type PosterId = "hero" | "action" | "hud";

function clampLayer(left: number, top: number, iw: number, ih: number, W: number, H: number) {
  return {
    left: Math.max(0, Math.min(W - iw, left)),
    top: Math.max(0, Math.min(H - ih, top)),
  };
}

async function logoLayer(W: number, topPad: number, widthFrac = 0.48): Promise<Layer> {
  const meta = await sharp(ASSETS.logo).metadata();
  const lw = meta.width ?? 1024;
  const lh = meta.height ?? 819;
  const targetW = Math.round(W * widthFrac);
  const targetH = Math.round((targetW / lw) * lh);
  const buf = await sharp(ASSETS.logo)
    .resize(targetW, targetH, { fit: "inside" })
    .png()
    .toBuffer();
  const out = await sharp(buf).metadata();
  return {
    input: buf,
    left: Math.round((W - (out.width ?? targetW)) / 2),
    top: topPad,
  };
}

/** Poster 1 — clean hero: farm bg + farmer + restrained coins + logo + CTA. */
export async function composeHero(W: number, H: number): Promise<Buffer> {
  const portrait = H > W;
  const layers: Layer[] = [];
  const base = await farmSceneBg(W, H);

  // Logo clear at top — leave room, no coin overlap
  layers.push(await logoLayer(W, portrait ? 44 : 32, 0.5));

  const farmerScale = portrait ? 13 : 11;
  const farmerNative = await extractFrame(
    ASSETS.farmerWalk,
    FARMER_WALK.tw,
    FARMER_WALK.th,
    1,
    0,
  );
  const farmer = await scaleNearest(farmerNative, farmerScale);
  const fMeta = await sharp(farmer).metadata();
  const fw = fMeta.width!;
  const fh = fMeta.height!;
  const farmerLeft = Math.round(W * 0.14);
  const farmerTop = H - fh - Math.round(H * (portrait ? 0.16 : 0.12));
  layers.push({ input: farmer, left: farmerLeft, top: farmerTop });

  // One hero coin by the hands
  const bigCoin = await renderKitIcon("coin_farm", 10); // 160
  const coinLeft = farmerLeft + Math.round(fw * 0.62);
  const coinTop = farmerTop + Math.round(fh * 0.32);
  layers.push({
    input: bigCoin,
    left: Math.min(W - 170, coinLeft),
    top: coinTop,
  });

  // Sparse coin trail to the RIGHT only — never over the logo
  const rand = mulberry32(0x50706d31);
  const logoBottom = portrait ? 44 + Math.round(W * 0.5 * 0.8) : 32 + Math.round(W * 0.5 * 0.8);
  for (let i = 0; i < 8; i++) {
    const cell = 4 + Math.floor(rand() * 4); // 4–7
    let coin = await renderKitIcon("coin_farm", cell);
    coin = await rotateSprite(coin, Math.round((rand() - 0.5) * 36));
    const cMeta = await sharp(coin).metadata();
    const pos = clampLayer(
      Math.round(W * 0.52 + rand() * W * 0.38 - (cMeta.width ?? 0) / 2),
      Math.round(Math.max(logoBottom + 20, H * 0.38) + rand() * H * 0.28),
      cMeta.width!,
      cMeta.height!,
      W,
      H,
    );
    layers.push({ input: coin, left: pos.left, top: pos.top });
  }

  const plaque = await woodPlaque({
    text: "FARM $FARM EVERY MINUTE.",
    width: Math.round(W * 0.86),
    height: portrait ? 84 : 74,
    fontSize: portrait ? 26 : 24,
    fill: "#8a5f36",
    textColor: "#fbf3e0",
    border: "#5b3c23",
  });
  const pMeta = await sharp(plaque).metadata();
  layers.push({
    input: plaque,
    left: Math.round((W - pMeta.width!) / 2),
    top: H - pMeta.height! - Math.round(H * 0.04),
  });

  return stack(base, layers);
}

/** Poster 2 — grounded harvest shot on the field, not floating in the sky. */
export async function composeAction(W: number, H: number): Promise<Buffer> {
  const portrait = H > W;
  const layers: Layer[] = [];
  const base = await farmSceneBg(W, H);
  const horizon = Math.round(H * 0.7);

  const plaque = await woodPlaque({
    text: "PLANT. HARVEST. GET PAID.",
    width: Math.round(W * 0.88),
    height: portrait ? 80 : 72,
    fontSize: portrait ? 24 : 22,
    fill: "#8a5f36",
    textColor: "#fbf3e0",
    border: "#5b3c23",
  });
  const plMeta = await sharp(plaque).metadata();
  layers.push({
    input: plaque,
    left: Math.round((W - plMeta.width!) / 2),
    top: Math.round(H * 0.05),
  });

  // Tall ready wheat growing UP from the field line (straddles horizon)
  const readyScale = portrait ? 12 : 11;
  const ready = await scaleNearest(ASSETS.wheatReady, readyScale);
  const rMeta = await sharp(ready).metadata();
  const readyLeft = Math.round((W - rMeta.width!) / 2 + W * 0.05);
  const readyTop = horizon - Math.round((rMeta.height ?? 0) * 0.72);
  layers.push({ input: ready, left: readyLeft, top: readyTop });

  const grow = await scaleNearest(ASSETS.wheatGrow, 6);
  const mat = await scaleNearest(ASSETS.wheatMat, 7);
  const gMeta = await sharp(grow).metadata();
  const mMeta = await sharp(mat).metadata();
  layers.push({
    input: grow,
    left: readyLeft - gMeta.width! - 24,
    top: horizon - Math.round((gMeta.height ?? 0) * 0.85),
  });
  layers.push({
    input: mat,
    left: readyLeft + rMeta.width! + 20,
    top: horizon - Math.round((mMeta.height ?? 0) * 0.8),
  });

  // Farmer mid-harvest — feet on field, beside the wheat
  const plowScale = portrait ? 7 : 6;
  const plowNative = await extractFrame(
    ASSETS.farmerPlow,
    FARMER_PLOW.tw,
    FARMER_PLOW.th,
    1,
    0,
  );
  const plow = await scaleNearest(plowNative, plowScale);
  const pMeta = await sharp(plow).metadata();
  layers.push({
    input: plow,
    left: Math.round(W * 0.08),
    top: horizon - (pMeta.height ?? 0) + 18,
  });

  const logo = await logoLayer(W, 0, 0.28);
  const ls = await sharp(logo.input).metadata();
  layers.push({
    input: logo.input,
    left: Math.round((W - (ls.width ?? 0)) / 2),
    top: H - (ls.height ?? 0) - Math.round(H * 0.025),
  });

  return stack(base, layers);
}

/** Poster 3 — pot figure as the hero, farm bg, no junk chrome. */
export async function composeHud(
  W: number,
  H: number,
  pot: PotSnapshot,
): Promise<Buffer> {
  const portrait = H > W;
  const layers: Layer[] = [];

  // Soft farm behind a parchment panel
  const farm = await farmSceneBg(W, H);
  const panel = await solidPng(Math.round(W * 0.88), Math.round(H * 0.78), PAL.cream, 0.94);
  const panelW = Math.round(W * 0.88);
  const panelH = Math.round(H * 0.78);
  let base = await stack(farm, [
    {
      input: panel,
      left: Math.round((W - panelW) / 2),
      top: Math.round((H - panelH) / 2),
    },
  ]);
  // Wood frame around panel
  const frameSvg = `<svg width="${panelW + 16}" height="${panelH + 16}" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="${panelW + 12}" height="${panelH + 12}" fill="none" stroke="#5b3c23" stroke-width="8" rx="8"/>
  <rect x="10" y="10" width="${panelW - 4}" height="${panelH - 4}" fill="none" stroke="#c9a46a" stroke-width="3" rx="4"/>
</svg>`;
  base = await stack(base, [
    {
      input: Buffer.from(frameSvg),
      left: Math.round((W - panelW) / 2) - 8,
      top: Math.round((H - panelH) / 2) - 8,
    },
  ]);

  layers.push(await logoLayer(W, Math.round((H - panelH) / 2) + 28, 0.36));

  const potLabel =
    pot.siloUsd != null && Number.isFinite(pot.siloUsd)
      ? formatUsd(pot.siloUsd)
      : "—";
  const ethLabel =
    pot.eth != null && Number.isFinite(pot.eth)
      ? formatEth(pot.eth)
      : pot.mock
        ? "pot unavailable"
        : "live silo";

  const siloIcon = await scaleNearest(ASSETS.hudSilo, 1);
  const potCard = await seasonPotCard({
    width: Math.round(W * 0.72),
    height: portrait ? 210 : 190,
    potLabel,
    ethLabel,
    siloIcon,
  });
  const potMeta = await sharp(potCard).metadata();
  const potLeft = Math.round((W - potMeta.width!) / 2);
  const potTop = Math.round(H * (portrait ? 0.34 : 0.32));
  layers.push({ input: potCard, left: potLeft, top: potTop });

  // Rank medal — one accent, clear of the $ amount
  const medal = await renderKitIcon("rank_gold", 6);
  layers.push({
    input: medal,
    left: potLeft + potMeta.width! - 20,
    top: potTop - 40,
  });

  // Coin + hype icons (real HUD art, no opaque-corner pills)
  const coin = await scaleNearest(ASSETS.hudCoin, 3);
  const hype = await scaleNearest(ASSETS.hudHype, 3);
  const cMeta = await sharp(coin).metadata();
  const hMeta = await sharp(hype).metadata();
  const iconsY = potTop + potMeta.height! + 36;
  const iconsGap = 48;
  const iconsTotal = (cMeta.width ?? 0) + iconsGap + (hMeta.width ?? 0);
  const iconsLeft = Math.round((W - iconsTotal) / 2);
  layers.push({ input: coin, left: iconsLeft, top: iconsY });
  layers.push({
    input: hype,
    left: iconsLeft + (cMeta.width ?? 0) + iconsGap,
    top: iconsY,
  });

  const cta = await woodPlaque({
    text: `${potLabel} IN THE POT.`,
    width: Math.round(W * 0.78),
    height: 72,
    fontSize: 22,
    fill: "#8a5f36",
    textColor: "#fbf3e0",
    border: "#5b3c23",
  });
  const sub = await woodPlaque({
    text: "PAID OUT DAILY.",
    width: Math.round(W * 0.5),
    height: 52,
    fontSize: 18,
    fill: "#5c8a3a",
    textColor: "#f7ffef",
    border: "#3d5c28",
  });
  const ctaM = await sharp(cta).metadata();
  const subM = await sharp(sub).metadata();
  const stackH = (ctaM.height ?? 0) + 10 + (subM.height ?? 0);
  const stackTop = H - stackH - Math.round(H * 0.06);
  layers.push({
    input: cta,
    left: Math.round((W - (ctaM.width ?? 0)) / 2),
    top: stackTop,
  });
  layers.push({
    input: sub,
    left: Math.round((W - (subM.width ?? 0)) / 2),
    top: stackTop + (ctaM.height ?? 0) + 10,
  });

  // No "DEMO" badge on the art — honesty stays in manifest.json

  return stack(base, layers);
}

export async function composePoster(
  id: PosterId,
  w: number,
  h: number,
  pot: PotSnapshot,
): Promise<Buffer> {
  switch (id) {
    case "hero":
      return composeHero(w, h);
    case "action":
      return composeAction(w, h);
    case "hud":
      return composeHud(w, h, pot);
    default:
      throw new Error(`Unknown poster: ${id}`);
  }
}
