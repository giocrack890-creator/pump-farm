/** Shared demo wallet types — kept separate to avoid circular imports with persist helpers. */

import type { FarmerSpeciesId, OwnedFarmer } from "@/lib/game/farmers";
import type { OwnedAnimal } from "@/lib/game/animals";
import type { DecorPlacement } from "@/lib/game/decor";
import type { WorkerUpgradeLevels } from "@/lib/game/workerUpgrades";
import type { SeedTierId } from "@/lib/game/seeds";

export const DEMO_ADDRESS = "0x0000000000000000000000000000000000faded1";

export type DemoPlot = {
  id: string;
  index: number;
  gridX: number;
  gridY: number;
  seedTier: string | null;
  plantedAt: string | null;
  maturesAt: string | null;
  harvestedAt: string | null;
  status: string;
};

export type DemoWallet = {
  address: string;
  displayName: string | null;
  hypeBalance: number;
  harvestStreak: number;
  lastHarvestDay: string | null;
  lastDailyHypeAt: string | null;
  referralCode: string;
  plots: DemoPlot[];
  seasonPoints: number;
  xp: number;
  gridSize: number;
  hasCompletedTutorial: boolean;
  farmers: OwnedFarmer[];
  scoutReadyAt: number;
  pendingScout: FarmerSpeciesId | null;
  farmersLastClaimAt: string | null;
  ownedAnimals: OwnedAnimal[];
  animalIdleClaimAt: string | null;
  decor: DecorPlacement[];
  lastSeenAt: string | null;
  pendingOfflineSummary: { crops: number; sp: number; capped: boolean } | null;
  workerUpgrades: WorkerUpgradeLevels;
  /** Global seed tier workers auto-plant (Hire panel). Default cheapest. */
  autoSeedTier: SeedTierId;
};
