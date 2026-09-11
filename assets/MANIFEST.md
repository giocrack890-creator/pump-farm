# Asset Manifest — Hood Harvest v10

## Pack (authoritative world art)

| Field | Value |
|-------|--------|
| Name | RPG Asset: Farming Sim Asset Pack |
| Author | VectoRaith |
| Source | itch.io (name-your-own-price) |
| License | Commercial use permitted; no resale/redistribution of the pack; not for NFT / AI-training use |
| Chosen tile size | **32×32 only** (do not mix 16 / 48 in `/play`) |
| Season default | **Spring** terrain + summer green tree accents |
| In-repo path | `assets/sprites/farming-sim/` (Original + served copies) → `public/assets/sprites/farming-sim/` |

## HUD / UI pack

| Field | Value |
|-------|--------|
| Sheet | `assets/sprites/ui/hud-pack/PUMP_FARM_HUD_UI_Asset_Pack.png` |
| Served slices | `public/assets/sprites/ui/hud/*` |
| Code paths | `components/hud/hudAssets.ts` |

Includes: wood panels (9-slice), stat pills, progress bar, nav frames, button states, icons. **UI chrome only** — world art remains VectoRaith farming-sim.

## Verified inventory (`Original/32x32/`)

Paths relative to pack root; Compact sheets are the primary gameplay sources.

| Sheet | Path | Contents (confirmed on disk) |
|-------|------|------------------------------|
| **Buildings** | `Tilesets (Compact)/vectoraith_tileset_farmingsims_buildings_32x32.png` (+ winter) | Farmhouse, barn, silo, shop/market, mailbox, chest, lamps, troughs, hay |
| **Crops** | `…_crops_32x32.png`, `…_crops_dense_32x32.png` | 32×32 frame grids; each row = crop growth L→R. Dense seasonal variants under Modular |
| **Terrain** | `…_terrains_32x32.png` | Autotile: tilled dirt, water/ponds, waterfalls, stone paths, cliffs. Seasonal Modular + RPG Maker autotiles |
| **Details** | `…_details_32x32.png` | **Wooden fences + gates** (normal + snow), rocks, stumps, 3 tree colors, bushes, mushrooms, grass tufts, lily pads |
| **Orchard** | `…_orchard_32x32.png` | Fruit trees |
| **Sprites** | `Sprites/$farmer_32x32.png`, `!$farmer_plowing_32x32.png` | 4-dir × 3-frame walk; plowing. Animals: cow/calf/goat/lamb/sheep/chicken/cat variants |

## What `/play` loads

- **Terrain tileset:** `public/.../tiles/terrain_spring.png` (from Compact/Modular spring)
- **Crop spritesheet:** `tiles/crops.png` as Phaser spritesheet `frameWidth/Height: 32` — see `game/cropFrames.ts` + contact sheet `crops/_contact_sheet.png`
- **Buildings / fences / trees / farmer / chicken:** cropped objects under `objects/`
- **Map:** `public/assets/maps/starter_farm.json` — 16×14 composed footprint, farmyard cluster, dirt path, fenced 5×4 soil, fog tile + locked signs on unclaimed rim, small pond

## Crop frames (verified)

```
CROP_FRAMES.turnip   = { seedling: 16, growing: 17, mature: 18, ready: 19 }  // Basic
CROP_FRAMES.carrot   = { seedling: 112, growing: 113, mature: 114, ready: 115 } // Hybrid
CROP_FRAMES.wheat    = { seedling: 24, growing: 25, mature: 26, ready: 27 }   // Golden
CROP_FRAMES.pumpkin  = { seedling: 144, growing: 145, mature: 146, ready: 147 } // Mythic
```

Do not guess indices — re-check the contact sheet first.

## Notes

- Fences and water **are in the pack** and are used in the v10 starter layout (earlier manifests wrongly said otherwise).
- Pack has **one** farmhouse sprite — Farm Level tiers use light tint, not new roofs.
- **Zero** AI-generated or code-baked world art in `/play`. Missing textures fail loudly in FarmScene.
