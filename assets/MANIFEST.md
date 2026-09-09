# Asset Manifest — Pump Farm v8 (pre-rendered 3D isometric)

## Sourcing path
**Path A** — licensed / free pre-rendered isometric 3D sprites (not live 3D, not AI-drawn iso).

| Pack | Author | License | Source |
|------|--------|---------|--------|
| **Isometric Miniature Farm** | Kenney | CC0 1.0 (public domain) | [OpenGameArt](https://opengameart.org/content/isometric-miniature-farm) / [Kenney.nl](https://kenney.nl) |

Assets are modeled/rendered offline from a fixed isometric camera, then used as transparent PNGs on a 2D isometric grid (Clash of Clans / AoE-style technique).

## Installed files
| Path | Notes |
|------|--------|
| `public/assets/sprites/tiles/tile_*.png` | Ground: grass, soil, path, water, dirt, locked (256×512 Kenney `_S` frames) |
| `public/assets/sprites/buildings/barn_l{1,5,10,15,20}.png` | Main building visual milestones by Farm Level |
| `public/assets/sprites/buildings/silo.png` | Silo / Rewards landmark |
| `public/assets/sprites/props/*` | Fence, hay, crate, expand sign |
| `public/assets/sprites/crops/{basic,hybrid,golden,mythic}_*.png` | Growth stages (Kenney corn tinted per tier) |
| `public/assets/sprites/companions/pet.png` | Companion prop |
| `public/assets/sprites/ui/*` | Sparkle FX, coin |

## Engine constants
- `TILE_WIDTH = 256`, `TILE_HEIGHT = 128` (2:1 diamond) — `game/iso.ts`
- Placement: `screenX = originX + (gx - gy) * (TW/2)`, etc.
- Depth: `(gx + gy) * 10 + layer`
- Missing textures: hard fail with on-screen key list (no magenta fallback)

## Script / render version
N/A for Path A (pack consumed as shipped). If migrating to Path B (Blender batch), log script version + camera/lighting hash here.

## License note (Kenney CC0)
> Creative Commons CC0 — you can copy, modify, distribute and perform the work, even for commercial purposes, all without asking permission.
