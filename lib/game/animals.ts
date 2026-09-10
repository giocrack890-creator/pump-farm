/** Buyable farm animals — wander on the lot and generate Hype. */

export type AnimalSpeciesId =
  | "chicken_hen"
  | "chicken_chick"
  | "cow_white"
  | "cow_brown"
  | "cow_holstein"
  | "calf_white"
  | "calf_brown"
  | "calf_holstein"
  | "sheep"
  | "lamb"
  | "goat"
  | "cat_orange";

export type AnimalSpecies = {
  id: AnimalSpeciesId;
  name: string;
  flavor: string;
  hypeCost: number;
  /** Passive Hype / sec while owned (claimed via Shop / claim-idle style). */
  hypePerSec: number;
  unlockLevel: number;
  /** Sheet under /assets/sprites/animals/ */
  sheet: string;
  /** Frame size in the sheet (most are 32×32 packed 3×4). */
  frameSize: number;
};

export const ANIMAL_SPECIES: Record<AnimalSpeciesId, AnimalSpecies> = {
  chicken_hen: {
    id: "chicken_hen",
    name: "Hen",
    flavor: "Clucks for Hype. Tiny but relentless.",
    hypeCost: 35,
    hypePerSec: 0.08,
    unlockLevel: 1,
    sheet: "chicken_hen.png",
    frameSize: 32,
  },
  chicken_chick: {
    id: "chicken_chick",
    name: "Chick",
    flavor: "Peep peep. Starter flock energy.",
    hypeCost: 18,
    hypePerSec: 0.04,
    unlockLevel: 1,
    sheet: "chicken_chick.png",
    frameSize: 32,
  },
  cow_white: {
    id: "cow_white",
    name: "White Cow",
    flavor: "Moo money. Steady pasture yield.",
    hypeCost: 120,
    hypePerSec: 0.28,
    unlockLevel: 3,
    sheet: "cow_white.png",
    frameSize: 48,
  },
  cow_brown: {
    id: "cow_brown",
    name: "Brown Cow",
    flavor: "Warm coat, warmer returns.",
    hypeCost: 130,
    hypePerSec: 0.3,
    unlockLevel: 4,
    sheet: "cow_brown.png",
    frameSize: 48,
  },
  cow_holstein: {
    id: "cow_holstein",
    name: "Holstein",
    flavor: "Classic spots. Classic drip.",
    hypeCost: 150,
    hypePerSec: 0.35,
    unlockLevel: 5,
    sheet: "cow_holstein.png",
    frameSize: 48,
  },
  calf_white: {
    id: "calf_white",
    name: "White Calf",
    flavor: "Growing into the big leagues.",
    hypeCost: 55,
    hypePerSec: 0.12,
    unlockLevel: 2,
    sheet: "calf_white.png",
    frameSize: 32,
  },
  calf_brown: {
    id: "calf_brown",
    name: "Brown Calf",
    flavor: "Small hooves, honest hustle.",
    hypeCost: 60,
    hypePerSec: 0.13,
    unlockLevel: 2,
    sheet: "calf_brown.png",
    frameSize: 32,
  },
  calf_holstein: {
    id: "calf_holstein",
    name: "Holstein Calf",
    flavor: "Baby spots. Future legend.",
    hypeCost: 70,
    hypePerSec: 0.15,
    unlockLevel: 3,
    sheet: "calf_holstein.png",
    frameSize: 32,
  },
  sheep: {
    id: "sheep",
    name: "Sheep",
    flavor: "Fluff that pays rent.",
    hypeCost: 90,
    hypePerSec: 0.2,
    unlockLevel: 3,
    sheet: "sheep.png",
    frameSize: 32,
  },
  lamb: {
    id: "lamb",
    name: "Lamb",
    flavor: "Soft launch of the flock.",
    hypeCost: 40,
    hypePerSec: 0.09,
    unlockLevel: 2,
    sheet: "lamb.png",
    frameSize: 32,
  },
  goat: {
    id: "goat",
    name: "Goat",
    flavor: "Eats anything. Prints Hype.",
    hypeCost: 85,
    hypePerSec: 0.22,
    unlockLevel: 4,
    sheet: "goat.png",
    frameSize: 32,
  },
  cat_orange: {
    id: "cat_orange",
    name: "Orange Cat",
    flavor: "Barn loft royalty. Moral support + Hype.",
    hypeCost: 75,
    hypePerSec: 0.16,
    unlockLevel: 2,
    sheet: "cat_orange.png",
    frameSize: 32,
  },
};

export type OwnedAnimal = {
  id: string;
  speciesId: AnimalSpeciesId;
  boughtAt: string;
};

export function animalHypePerSec(animals: OwnedAnimal[]): number {
  return animals.reduce((a, o) => a + (ANIMAL_SPECIES[o.speciesId]?.hypePerSec ?? 0), 0);
}

export function computeAnimalIdleHype(
  animals: OwnedAnimal[],
  lastClaimAt: string | null,
  now = Date.now(),
  capSec = 8 * 3600,
): number {
  if (!lastClaimAt || animals.length === 0) return 0;
  const elapsed = Math.min(capSec, Math.max(0, (now - new Date(lastClaimAt).getTime()) / 1000));
  return Math.floor(animalHypePerSec(animals) * elapsed * 100) / 100;
}
