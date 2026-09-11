import path from "node:path";

export const ROOT = path.resolve(__dirname, "../..");
export const PUBLIC = path.join(ROOT, "public");
export const OUT_DIR = path.join(ROOT, "exports/social-posters");

export const ASSETS = {
  logo: path.join(PUBLIC, "assets/landing/logo-hood-harvest.png"),
  heroBg: path.join(PUBLIC, "assets/landing/hero-fondo-farm.jpg"),
  farmerWalk: path.join(PUBLIC, "assets/sprites/animals/farmer_walk.png"),
  farmerPlow: path.join(PUBLIC, "assets/sprites/animals/farmer_plow.png"),
  barn: path.join(PUBLIC, "assets/sprites/farming-sim/objects/barn.png"),
  silo: path.join(PUBLIC, "assets/sprites/farming-sim/objects/silo.png"),
  tree: path.join(PUBLIC, "assets/sprites/farming-sim/objects/tree.png"),
  bush: path.join(PUBLIC, "assets/sprites/farming-sim/objects/bush.png"),
  fenceH: path.join(PUBLIC, "assets/sprites/farming-sim/objects/fence_h.png"),
  tileGrass: path.join(PUBLIC, "assets/sprites/farming-sim/objects/tile_grass.png"),
  tileGrass2: path.join(PUBLIC, "assets/sprites/farming-sim/objects/tile_grass2.png"),
  grassFill: path.join(PUBLIC, "assets/sprites/farming-sim/objects/grass_fill.png"),
  plotSoil: path.join(PUBLIC, "assets/sprites/farming-sim/objects/plot_soil.png"),
  tileDirt: path.join(PUBLIC, "assets/sprites/farming-sim/objects/tile_dirt.png"),
  wheatReady: path.join(PUBLIC, "assets/sprites/farming-sim/crops/_frames/wheat_ready_27.png"),
  wheatMat: path.join(PUBLIC, "assets/sprites/farming-sim/crops/_frames/wheat_mat_26.png"),
  wheatGrow: path.join(PUBLIC, "assets/sprites/farming-sim/crops/_frames/wheat_grow_25.png"),
  wheatSeed: path.join(PUBLIC, "assets/sprites/farming-sim/crops/_frames/wheat_seed_24.png"),
  farmCoin: path.join(PUBLIC, "assets/sprites/ui/farm_coin.png"),
  hudCoin: path.join(PUBLIC, "assets/sprites/ui/hud/icon_coin.png"),
  hudHype: path.join(PUBLIC, "assets/sprites/ui/hud/icon_hype.png"),
  hudSilo: path.join(PUBLIC, "assets/sprites/ui/hud/icon_silo.png"),
  pillFarm: path.join(PUBLIC, "assets/sprites/ui/hud/pill_farm.png"),
  pillHype: path.join(PUBLIC, "assets/sprites/ui/hud/pill_hype.png"),
} as const;

/** Farmer walk sheet: 32×64 frames, 3 cols × 4 rows. */
export const FARMER_WALK = { tw: 32, th: 64, cols: 3 } as const;
/** Farmer plow sheet: 64×64 frames, 3 cols × 4 rows. */
export const FARMER_PLOW = { tw: 64, th: 64, cols: 3 } as const;

export type PosterSize = { w: number; h: number; label: string };

export const SIZES: PosterSize[] = [
  { w: 1080, h: 1080, label: "1080" },
  { w: 1080, h: 1350, label: "1350" },
];
