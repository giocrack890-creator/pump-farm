/** Hired Farmers — adapted from Hooders idle hire/deploy loop for Pump Farm. */

export type FarmerRarity = "common" | "rare" | "epic" | "legendary";

export type FarmerSpeciesId =
  | "field_hand"
  | "seed_scout"
  | "plot_tender"
  | "harvest_hand"
  | "greenhouse_tech"
  | "crop_analyst"
  | "hype_wrangler"
  | "silo_keeper"
  | "golden_reaper"
  | "mythic_tiller"
  | "farm_mogul";

export type FarmerSpecies = {
  id: FarmerSpeciesId;
  name: string;
  rarity: FarmerRarity;
  /** Hype earned per second while deployed (base, lv1). */
  baseHypePerSec: number;
  /** Flat SP bonus applied on each harvest while deployed (shared, stacked capped). */
  harvestSpBoost: number;
  flavor: string;
  unlockLevel: number;
};

export const FARMER_SPECIES: Record<FarmerSpeciesId, FarmerSpecies> = {
  field_hand: {
    id: "field_hand",
    name: "Field Hand",
    rarity: "common",
    baseHypePerSec: 0.15,
    harvestSpBoost: 0.02,
    flavor: "Hoe in hand. Keeps the dirt honest.",
    unlockLevel: 1,
  },
  seed_scout: {
    id: "seed_scout",
    name: "Seed Scout",
    rarity: "common",
    baseHypePerSec: 0.16,
    harvestSpBoost: 0.02,
    flavor: "Sniffs out Basic plots before coffee.",
    unlockLevel: 1,
  },
  plot_tender: {
    id: "plot_tender",
    name: "Plot Tender",
    rarity: "common",
    baseHypePerSec: 0.18,
    harvestSpBoost: 0.03,
    flavor: "Waters on schedule. Rarely overwaters.",
    unlockLevel: 1,
  },
  harvest_hand: {
    id: "harvest_hand",
    name: "Harvest Hand",
    rarity: "rare",
    baseHypePerSec: 0.45,
    harvestSpBoost: 0.05,
    flavor: "Cuts green candles clean.",
    unlockLevel: 5,
  },
  greenhouse_tech: {
    id: "greenhouse_tech",
    name: "Greenhouse Tech",
    rarity: "rare",
    baseHypePerSec: 0.5,
    harvestSpBoost: 0.06,
    flavor: "Hybrid whisperer.",
    unlockLevel: 5,
  },
  crop_analyst: {
    id: "crop_analyst",
    name: "Crop Analyst",
    rarity: "rare",
    baseHypePerSec: 0.55,
    harvestSpBoost: 0.06,
    flavor: "Spreadsheets the soil moisture.",
    unlockLevel: 8,
  },
  hype_wrangler: {
    id: "hype_wrangler",
    name: "Hype Wrangler",
    rarity: "epic",
    baseHypePerSec: 1.2,
    harvestSpBoost: 0.08,
    flavor: "Rides the narrative wave.",
    unlockLevel: 10,
  },
  silo_keeper: {
    id: "silo_keeper",
    name: "Silo Keeper",
    rarity: "epic",
    baseHypePerSec: 1.4,
    harvestSpBoost: 0.09,
    flavor: "Sleeps next to the fee vault.",
    unlockLevel: 12,
  },
  golden_reaper: {
    id: "golden_reaper",
    name: "Golden Reaper",
    rarity: "epic",
    baseHypePerSec: 1.6,
    harvestSpBoost: 0.1,
    flavor: "Only swings for Golden Harvests.",
    unlockLevel: 15,
  },
  mythic_tiller: {
    id: "mythic_tiller",
    name: "Mythic Tiller",
    rarity: "legendary",
    baseHypePerSec: 3.2,
    harvestSpBoost: 0.15,
    flavor: "Diamond hands, dirt under nails.",
    unlockLevel: 18,
  },
  farm_mogul: {
    id: "farm_mogul",
    name: "Farm Mogul",
    rarity: "legendary",
    baseHypePerSec: 3.8,
    harvestSpBoost: 0.18,
    flavor: "Owns three counties. Works yours.",
    unlockLevel: 20,
  },
};

export const HIRE_HYPE_COST: Record<FarmerRarity, number> = {
  common: 40,
  rare: 180,
  epic: 600,
  legendary: 2200,
};

export const RARITY_WEIGHTS: Record<FarmerRarity, number> = {
  common: 70,
  rare: 22,
  epic: 7,
  legendary: 1,
};

export const RARITY_LABEL: Record<FarmerRarity, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

export const RARITY_COLOR: Record<FarmerRarity, string> = {
  common: "#3a2414",
  rare: "#1a5c30",
  epic: "#5b2d8e",
  legendary: "#8a5a10",
};

export const MAX_FIELD_SPOTS_BASE = 3;
export const MAX_FIELD_SPOTS_CAP = 8;
export const SCOUT_COOLDOWN_MS = 8_000;
export const IDLE_CLAIM_CAP_SEC = 8 * 3600; // 8h offline cap

export type OwnedFarmer = {
  id: string;
  speciesId: FarmerSpeciesId;
  level: number;
  deployed: boolean;
  hiredAt: string;
};

export function fieldSpotsForLevel(farmLevel: number): number {
  return Math.min(
    MAX_FIELD_SPOTS_CAP,
    MAX_FIELD_SPOTS_BASE + Math.floor(Math.max(0, farmLevel - 1) / 4),
  );
}

export function hireCost(rarity: FarmerRarity, rosterSize: number): number {
  return Math.floor(HIRE_HYPE_COST[rarity] * (1 + 0.1 * rosterSize));
}

export function farmerHypePerSec(f: OwnedFarmer): number {
  const sp = FARMER_SPECIES[f.speciesId];
  const lvlMult = 1 + (f.level - 1) * 0.12;
  return sp.baseHypePerSec * lvlMult;
}

export function deployedIncomePerSec(farmers: OwnedFarmer[]): number {
  return farmers.filter((f) => f.deployed).reduce((a, f) => a + farmerHypePerSec(f), 0);
}

/** Activity 1–4× — Hooders Closing Bell analogue for Pump Farm harvest share flavor. */
export function activityMultiplier(farmers: OwnedFarmer[]): number {
  const rate = deployedIncomePerSec(farmers);
  if (rate <= 0) return 1;
  return Math.min(4, 1 + rate / 4);
}

export function harvestBoostFromFarmers(farmers: OwnedFarmer[]): number {
  const boosts = farmers
    .filter((f) => f.deployed)
    .map((f) => FARMER_SPECIES[f.speciesId].harvestSpBoost);
  return Math.min(0.45, boosts.reduce((a, b) => a + b, 0));
}

export function rollRarity(rng = Math.random): FarmerRarity {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (const [rar, w] of Object.entries(RARITY_WEIGHTS) as [FarmerRarity, number][]) {
    r -= w;
    if (r <= 0) return rar;
  }
  return "common";
}

export function speciesPoolForRarity(
  rarity: FarmerRarity,
  farmLevel: number,
): FarmerSpeciesId[] {
  return (Object.keys(FARMER_SPECIES) as FarmerSpeciesId[]).filter((id) => {
    const s = FARMER_SPECIES[id];
    return s.rarity === rarity && farmLevel >= s.unlockLevel;
  });
}

export function pickScoutSpecies(farmLevel: number, rng = Math.random): FarmerSpeciesId {
  let rarity = rollRarity(rng);
  let pool = speciesPoolForRarity(rarity, farmLevel);
  while (!pool.length && rarity !== "common") {
    rarity =
      rarity === "legendary" ? "epic" : rarity === "epic" ? "rare" : "common";
    pool = speciesPoolForRarity(rarity, farmLevel);
  }
  if (!pool.length) return "field_hand";
  return pool[Math.floor(rng() * pool.length)]!;
}

export function computeIdleHype(
  farmers: OwnedFarmer[],
  lastClaimAt: string | null,
  now = Date.now(),
): number {
  if (!lastClaimAt) return 0;
  const elapsed = Math.min(
    IDLE_CLAIM_CAP_SEC,
    Math.max(0, (now - new Date(lastClaimAt).getTime()) / 1000),
  );
  return Math.floor(deployedIncomePerSec(farmers) * elapsed * 100) / 100;
}

export function promoteCost(level: number): number {
  return Math.floor(25 * Math.pow(1.55, level - 1));
}
