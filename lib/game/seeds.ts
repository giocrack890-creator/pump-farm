import { LEVEL_GATES } from "./xp";

export type SeedTierId = "Basic" | "Hybrid" | "Golden" | "Mythic";

export type SeedDef = {
  id: SeedTierId;
  label: string;
  spriteKey: string;
  hypeCost: number;
  growMs: number;
  /** Demo grow override for localhost feel */
  demoGrowMs: number;
  baseYieldSp: number;
  unlockLevel: number;
  flavor: string;
};

export const SEED_DEFS: Record<SeedTierId, SeedDef> = {
  Basic: {
    id: "Basic",
    label: "Turnip Seed",
    spriteKey: "basic",
    hypeCost: 5,
    growMs: 4 * 3600_000,
    demoGrowMs: 30_000,
    baseYieldSp: 10,
    unlockLevel: 1,
    flavor: "Humble white turnip — first harvest of the season.",
  },
  Hybrid: {
    id: "Hybrid",
    label: "Carrot Seed",
    spriteKey: "hybrid",
    hypeCost: 15,
    growMs: 8 * 3600_000,
    demoGrowMs: 45_000,
    baseYieldSp: 25,
    unlockLevel: LEVEL_GATES.hybridSeeds,
    flavor: "Orange roots for patient farmers.",
  },
  Golden: {
    id: "Golden",
    label: "Wheat Seed",
    spriteKey: "golden",
    hypeCost: 40,
    growMs: 12 * 3600_000,
    demoGrowMs: 60_000,
    baseYieldSp: 60,
    unlockLevel: LEVEL_GATES.goldenSeeds,
    flavor: "Golden grain that fills the silo.",
  },
  Mythic: {
    id: "Mythic",
    label: "Pumpkin Seed",
    spriteKey: "mythic",
    hypeCost: 90,
    growMs: 18 * 3600_000,
    demoGrowMs: 75_000,
    baseYieldSp: 140,
    unlockLevel: LEVEL_GATES.mythicSeeds,
    flavor: "Heavy vine fruit — late-season prize.",
  },
};

export function unlockedSeeds(level: number): SeedDef[] {
  return Object.values(SEED_DEFS).filter((s) => level >= s.unlockLevel);
}
