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
    label: "Basic Pump Seed",
    spriteKey: "basic",
    hypeCost: 5,
    growMs: 4 * 3600_000,
    demoGrowMs: 30_000,
    baseYieldSp: 10,
    unlockLevel: 1,
    flavor: "Green candle starter pack. Humble beginnings.",
  },
  Hybrid: {
    id: "Hybrid",
    label: "Hybrid Seed",
    spriteKey: "hybrid",
    hypeCost: 15,
    growMs: 8 * 3600_000,
    demoGrowMs: 45_000,
    baseYieldSp: 25,
    unlockLevel: LEVEL_GATES.hybridSeeds,
    flavor: "Crossbred between FOMO and patience.",
  },
  Golden: {
    id: "Golden",
    label: "Golden Seed",
    spriteKey: "golden",
    hypeCost: 40,
    growMs: 12 * 3600_000,
    demoGrowMs: 60_000,
    baseYieldSp: 60,
    unlockLevel: LEVEL_GATES.goldenSeeds,
    flavor: "Glows when the chart goes vertical.",
  },
  Mythic: {
    id: "Mythic",
    label: "Diamond Hands Seed",
    spriteKey: "mythic",
    hypeCost: 90,
    growMs: 18 * 3600_000,
    demoGrowMs: 75_000,
    baseYieldSp: 140,
    unlockLevel: LEVEL_GATES.mythicSeeds,
    flavor: "Never sells. Not even at -90%. Respect.",
  },
};

export function unlockedSeeds(level: number): SeedDef[] {
  return Object.values(SEED_DEFS).filter((s) => level >= s.unlockLevel);
}
