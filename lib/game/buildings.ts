export type BuildingTier = 1 | 2 | 3;

export const BARN_TIERS: Record<
  BuildingTier,
  { label: string; spCost: number; unlockLevel: number; harvestBonus: number; hypeBonus: number }
> = {
  1: { label: "Starter Exchange", spCost: 0, unlockLevel: 1, harvestBonus: 0, hypeBonus: 0 },
  2: { label: "Neon Barn", spCost: 200, unlockLevel: 15, harvestBonus: 0.08, hypeBonus: 0.05 },
  3: { label: "Ticker Tower", spCost: 800, unlockLevel: 20, harvestBonus: 0.15, hypeBonus: 0.1 },
};

/** Map treasury ETH balance to silo visual tier. */
export function siloTierFromBalance(sol: number): BuildingTier {
  if (sol >= 50) return 3;
  if (sol >= 10) return 2;
  return 1;
}

export const LAND_EXPANSIONS = [
  { id: "exp1", fromSize: 3, toSize: 4, unlockLevel: 5, hypeCost: 80, spCost: 50 },
  { id: "exp2", fromSize: 4, toSize: 5, unlockLevel: 10, hypeCost: 200, spCost: 150 },
] as const;
