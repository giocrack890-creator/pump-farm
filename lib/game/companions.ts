/** Companion roster — passive bonuses for Farm Level ≥ companion gate. */

import { LEVEL_GATES } from "./xp";

export type CompanionId = "hype_hound" | "lucky_catcoin" | "candle_frog";

export type CompanionDef = {
  id: CompanionId;
  name: string;
  sprite: string;
  unlockLevel: number;
  /** Multiplicative bonus keys applied in harvest / hype math */
  hypeRegenBonus: number;
  goldenOddsBonus: number;
  harvestYieldBonus: number;
  flavor: string;
};

export const COMPANIONS: Record<CompanionId, CompanionDef> = {
  hype_hound: {
    id: "hype_hound",
    name: "Hype Hound",
    sprite: "/assets/sprites/companions/pet.png",
    unlockLevel: LEVEL_GATES.companion,
    hypeRegenBonus: 0.12,
    goldenOddsBonus: 0,
    harvestYieldBonus: 0,
    flavor: "Sniffs out alpha. Boosts Hype regen.",
  },
  lucky_catcoin: {
    id: "lucky_catcoin",
    name: "Lucky Cat-coin",
    sprite: "/assets/sprites/companions/pet.png", // TODO_REPLACE_ASSET: distinct cat sprite
    unlockLevel: LEVEL_GATES.companion,
    hypeRegenBonus: 0,
    goldenOddsBonus: 0.05,
    harvestYieldBonus: 0,
    flavor: "Waves for Golden Harvest luck.",
  },
  candle_frog: {
    id: "candle_frog",
    name: "Candle Frog",
    sprite: "/assets/sprites/companions/pet.png", // TODO_REPLACE_ASSET: frog sprite
    unlockLevel: LEVEL_GATES.companion,
    hypeRegenBonus: 0,
    goldenOddsBonus: 0,
    harvestYieldBonus: 0.08,
    flavor: "Ribbits when candles print green.",
  },
};

export function companionsUnlocked(level: number): CompanionDef[] {
  return Object.values(COMPANIONS).filter((c) => level >= c.unlockLevel);
}
