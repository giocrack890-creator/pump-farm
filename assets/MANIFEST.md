# Asset Manifest — Pump Farm v9

## Pack (authoritative world art)

| Field | Value |
|-------|--------|
| Name | RPG Asset: Farming Sim Asset Pack |
| Author | VectoRaith |
| Source | itch.io (name-your-own-price) |
| License | Commercial use permitted; no resale/redistribution of the pack; not for NFT / AI-training use |
| Chosen tile size | **32×32 only** (do not mix 16 / 48 in `/play`) |
| Season default | **Spring** terrain + summer green tree accents |
| In-repo path | `assets/sprites/farming-sim/32x32/` (source) → served from `public/assets/sprites/farming-sim/` |

## HUD / UI pack

| Field | Value |
|-------|--------|
| Sheet | `assets/sprites/ui/hud-pack/PUMP_FARM_HUD_UI_Asset_Pack.png` |
| Served slices | `public/assets/sprites/ui/hud/*` |
| Code paths | `components/hud/hudAssets.ts` |

Includes: wood panels (9-slice), stat pills, progress bar, nav frames, button states, 20× 32-ish icons (coin, hype, XP, silo, medal, etc.). These are **UI chrome only** — world art remains VectoRaith farming-sim only.

## What we use

- **Terrain:** `Tilesets (Compact)/…terrain_spring_expanded_32x32.png` → `public/.../tiles/terrain_spring.png`
- **Buildings:** cropped from compact buildings sheet → `objects/farmhouse.png`, `barn.png`, `silo.png`
- **Crops (launch 4):** turnip-like → Basic; carrot-like → Hybrid; golden grain → Golden; orange vine fruit → Mythic — frames under `crops/{tier}/0..3.png`
- **Animals:** `$chicken_hen_32x32.png` frame → companions
- **Trees:** summer green tree from details sheet → `objects/tree.png`
- **Map:** Tiled JSON `public/assets/maps/starter_farm.json` (orthogonal), loaded via Phaser `tilemapTiledJSON`

## Known gaps / notes

- Starter layout **omits fences and ponds** by design (composition uses dirt path + tilled soil edge). The pack *does* include fence/water tiles for a later licensed polish pass — do **not** invent replacements.
- Pack has **one** farmhouse sprite — Farm Level tiers use light tint / decoration from the same pack, not new generated roofs (documented limitation).
- **Zero** AI-generated or code-baked world art in `/play`. If a texture key is missing, FarmScene fails loudly on-screen.

## HUD palette (sampled from pack)

Warm earth browns (`#5c3a1e`, `#c9a46a`), spring grass (`#7bb85c`), parchment (`#efe0bc`). UI icons may stay as existing small HUD icons; environment art must stay pack-only.
