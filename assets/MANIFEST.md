# Asset Manifest — Pump Farm v3

## Provider
**Free only.** No fal.ai / paid APIs.

Art is produced via **Cursor GenerateImage** (style-locked to the barn anchor) + flood-fill transparency postprocess. Derived tints fill remaining crop stages / barn·silo tiers.

Do **not** draw world objects with SVG / canvas / CSS shapes.

## Style lock
> Cute isometric 2.5D mobile game asset, painterly cel-shaded style, warm saturated color palette, soft rounded proportions, soft directional sunlight from upper-left casting gentle rounded shadows, clean thick outline, plain white background for cutout, Hay Day / Township production value — NOT flat vector, NOT clipart, NOT photorealistic.

## Key files
| Path | Notes |
|---|---|
| `public/assets/hero-farm-bg.png` | Landing golden-hour farm painting |
| `public/assets/sprites/buildings/barn_1.png` | Style anchor |
| `public/assets/sprites/ground/*` | Grass / soil / path / water tiles |
| `public/assets/sprites/crops/*` | 4 tiers × 4 stages + blight |
| `public/assets/icons/*` | HUD badges (no emoji) |

## Regenerate
Ask the agent to GenerateImage more assets with the shared style prompt + barn reference. Then run the cutout/normalize postprocess. `scripts/generate-assets.ts` documents the free path only.
