# Asset Manifest — Pump Farm (Stardew Valley–style rebuild)

## Engine
Orthogonal **top-down pixel** farm (not isometric).

| Constant | Value |
|----------|--------|
| `TILE_SIZE` | 16 |
| `PIXEL_SCALE` | 4 |
| `TILE_SCREEN` | 64 |

Textures for ground, crops, props, and barn tiers are **baked at runtime** in Phaser (`game/FarmScene.ts` → `bakePixelTextures`) so the look stays consistent Stardew-adjacent wood/grass/soil without relying on the old Kenney isometric pack for the playfield.

## HUD
Stardew wood / parchment chrome remains in `components/hud/*`.

## Prior iso pack
Kenney Isometric Miniature Farm assets may still exist under `public/assets/sprites/` for landing/UI leftovers; the live `/play` scene no longer places them on an iso grid.
