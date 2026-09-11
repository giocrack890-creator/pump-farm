#!/usr/bin/env tsx
/**
 * Hood Harvest — social poster exporter
 *
 * Composes 1080×1080 and 1080×1350 PNGs from REAL in-repo sprites
 * (VectoRaith farming pack, farmer sheets, HUD icons, wood-plank logo)
 * with nearest-neighbor integer scaling. No AI-generated art.
 *
 * Usage:
 *   npx tsx scripts/export-social-posters.ts
 *   npx tsx scripts/export-social-posters.ts --only hero
 *   POSTER_API_BASE=https://pump-farm.vercel.app npx tsx scripts/export-social-posters.ts
 */
import fs from "node:fs/promises";
import path from "node:path";
import { OUT_DIR, SIZES } from "./social-posters/paths";
import { fetchPotSnapshot, formatUsd } from "./social-posters/fetchPot";
import { composePoster, type PosterId } from "./social-posters/posters";

const ALL: PosterId[] = ["hero", "action", "hud"];

function parseOnly(): PosterId[] {
  const idx = process.argv.indexOf("--only");
  if (idx === -1) return ALL;
  const raw = process.argv[idx + 1];
  if (!raw) return ALL;
  const ids = raw.split(",").map((s) => s.trim()) as PosterId[];
  for (const id of ids) {
    if (!ALL.includes(id)) {
      throw new Error(`Unknown poster "${id}". Use: ${ALL.join(", ")}`);
    }
  }
  return ids;
}

async function main() {
  const ids = parseOnly();
  await fs.mkdir(OUT_DIR, { recursive: true });

  console.log("Fetching live Season Pot…");
  const pot = await fetchPotSnapshot();
  console.log(
    `  pot=${pot.siloUsd != null ? formatUsd(pot.siloUsd) : "—"} mock=${pot.mock} source=${pot.source}`,
  );

  const written: string[] = [];
  for (const id of ids) {
    for (const size of SIZES) {
      const name = `poster-${id}-${size.label}.png`;
      const out = path.join(OUT_DIR, name);
      process.stdout.write(`Composing ${name}… `);
      const buf = await composePoster(id, size.w, size.h, pot);
      await fs.writeFile(out, buf);
      console.log(`ok (${size.w}×${size.h})`);
      written.push(out);
    }
  }

  // Manifest for downstream tools
  const manifest = {
    generatedAt: new Date().toISOString(),
    pot,
    files: written.map((f) => path.relative(process.cwd(), f)),
    rules: [
      "All characters/crops/buildings are real sprites from public/assets/sprites",
      "Pixel-art scaled with sharp kernel:nearest at integer factors only",
      "coin_farm / rank_* from kit drawers matching PixelIcon.tsx",
      "Wood-plank logo = assets/landing/logo-hood-harvest.png (landing hero asset)",
      "Pot headline number from live treasury only — never invented demo figures",
    ],
  };
  await fs.writeFile(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );

  console.log("\nDone:");
  for (const f of written) console.log(`  ${path.relative(process.cwd(), f)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
