/** Placeable farm decorations — accumulate with Farm Level / Decor tab. */

export type DecorItemId = "fence" | "hay" | "crate" | "sign" | "tree";

export type DecorItem = {
  id: DecorItemId;
  label: string;
  textureKey: string;
  unlockLevel: number;
  hypeCost: number;
};

export const DECOR_ITEMS: Record<DecorItemId, DecorItem> = {
  fence: {
    id: "fence",
    label: "Rustic Fence",
    textureKey: "prop_fence",
    unlockLevel: 1,
    hypeCost: 15,
  },
  hay: {
    id: "hay",
    label: "Hay Bale",
    textureKey: "prop_hay",
    unlockLevel: 3,
    hypeCost: 25,
  },
  crate: {
    id: "crate",
    label: "Supply Crate",
    textureKey: "prop_crate",
    unlockLevel: 5,
    hypeCost: 40,
  },
  sign: {
    id: "sign",
    label: "Farm Sign",
    textureKey: "prop_sign",
    unlockLevel: 8,
    hypeCost: 60,
  },
  tree: {
    id: "tree",
    label: "Shade Tree",
    textureKey: "prop_tree",
    unlockLevel: 10,
    hypeCost: 90,
  },
};

/** Fixed edge slots on the Tiled starter map (tile coords). */
export const DECOR_SLOTS: { gridX: number; gridY: number }[] = [
  { gridX: 2, gridY: 16 },
  { gridX: 4, gridY: 17 },
  { gridX: 20, gridY: 16 },
  { gridX: 18, gridY: 17 },
  { gridX: 1, gridY: 10 },
  { gridX: 22, gridY: 10 },
  { gridX: 7, gridY: 15 },
  { gridX: 19, gridY: 14 },
];

export type DecorPlacement = {
  id: string;
  itemId: DecorItemId;
  gridX: number;
  gridY: number;
};
