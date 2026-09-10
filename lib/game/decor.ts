/** Placeable farm shop items — props + artifacts for the Shop tab. */

export type DecorItemId =
  | "fence"
  | "hay"
  | "crate"
  | "sign"
  | "tree"
  | "bush"
  | "rock"
  | "stump"
  | "chicken";

export type DecorCategory = "prop" | "artifact";

export type DecorItem = {
  id: DecorItemId;
  label: string;
  /** Phaser / sprite texture key under farming-sim/objects */
  textureKey: string;
  unlockLevel: number;
  hypeCost: number;
  category: DecorCategory;
  flavor: string;
  /** UI art path */
  art: string;
};

const obj = (name: string) => `/assets/sprites/farming-sim/objects/${name}.png`;

export const DECOR_ITEMS: Record<DecorItemId, DecorItem> = {
  fence: {
    id: "fence",
    label: "Rustic Fence",
    textureKey: "fence_0",
    unlockLevel: 1,
    hypeCost: 15,
    category: "prop",
    flavor: "Keeps the vibes (and cows) in the right paddock.",
    art: obj("fence_0"),
  },
  hay: {
    id: "hay",
    label: "Hay Bale",
    textureKey: "hay",
    unlockLevel: 2,
    hypeCost: 25,
    category: "prop",
    flavor: "Soft landing for failed trades. Also for chickens.",
    art: obj("hay"),
  },
  crate: {
    id: "crate",
    label: "Supply Crate",
    textureKey: "crate",
    unlockLevel: 4,
    hypeCost: 40,
    category: "prop",
    flavor: "Mystery loot energy. Usually just potatoes.",
    art: obj("crate"),
  },
  sign: {
    id: "sign",
    label: "Farm Sign",
    textureKey: "sign",
    unlockLevel: 6,
    hypeCost: 55,
    category: "prop",
    flavor: "Name your empire. Or just write WAGMI.",
    art: obj("sign"),
  },
  tree: {
    id: "tree",
    label: "Shade Tree",
    textureKey: "tree",
    unlockLevel: 8,
    hypeCost: 90,
    category: "prop",
    flavor: "Pixel canopy for tired farmers.",
    art: obj("tree"),
  },
  bush: {
    id: "bush",
    label: "Berry Bush",
    textureKey: "bush",
    unlockLevel: 3,
    hypeCost: 35,
    category: "artifact",
    flavor: "Snack hub. Looks edible. Is it? Ask Clucky.",
    art: obj("bush"),
  },
  rock: {
    id: "rock",
    label: "Lucky Stone",
    textureKey: "rock",
    unlockLevel: 5,
    hypeCost: 70,
    category: "artifact",
    flavor: "Allegedly boosts harvest luck. Definitely looks cool.",
    art: obj("rock"),
  },
  stump: {
    id: "stump",
    label: "Ancient Stump",
    textureKey: "stump",
    unlockLevel: 7,
    hypeCost: 85,
    category: "artifact",
    flavor: "Cut down in a previous Season. Still vibing.",
    art: obj("stump"),
  },
  chicken: {
    id: "chicken",
    label: "Clucky Totem",
    textureKey: "chicken",
    unlockLevel: 10,
    hypeCost: 120,
    category: "artifact",
    flavor: "Decorative chicken spirit. Does not lay coins. Yet.",
    art: obj("chicken"),
  },
};

/** Fixed edge slots near the organic farmyard (tile coords). */
export const DECOR_SLOTS: { gridX: number; gridY: number }[] = [
  { gridX: 17, gridY: 14 },
  { gridX: 17, gridY: 20 },
  { gridX: 19, gridY: 12 },
  { gridX: 27, gridY: 12 },
  { gridX: 30, gridY: 14 },
  { gridX: 31, gridY: 19 },
  { gridX: 26, gridY: 26 },
  { gridX: 20, gridY: 26 },
  { gridX: 18, gridY: 24 },
  { gridX: 29, gridY: 22 },
];

export type DecorPlacement = {
  id: string;
  itemId: DecorItemId;
  gridX: number;
  gridY: number;
};
