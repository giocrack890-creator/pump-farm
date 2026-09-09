/**
 * Asset pipeline notes — FREE path only (no fal.ai / paid APIs).
 *
 * Art is generated with Cursor GenerateImage (style-locked to barn anchor),
 * then cut out + normalized with the Python postprocess used in-session.
 *
 * This script only validates that required sprites exist and refreshes MANIFEST.md.
 * It will NOT call paid image APIs.
 */

import { existsSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const required = [
  "public/assets/sprites/buildings/barn_1.png",
  "public/assets/sprites/ground/grass_1.png",
  "public/assets/sprites/ground/soil.png",
  "public/assets/icons/silo.png",
  "public/assets/hero-farm-bg.png",
];

let ok = true;
for (const rel of required) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) {
    console.error("MISSING", rel);
    ok = false;
  } else {
    console.log("ok", rel);
  }
}

writeFileSync(
  join(ROOT, "assets", "MANIFEST.md"),
  `# Asset Manifest — Pump Farm v3

## Provider
**Free only.** No fal.ai / paid APIs.

Validated: ${new Date().toISOString()}

Required sprites: ${ok ? "present" : "INCOMPLETE — regenerate with Cursor GenerateImage"}
`,
);

if (!ok) process.exit(1);
console.log("Free asset check passed. Paid generators disabled.");
