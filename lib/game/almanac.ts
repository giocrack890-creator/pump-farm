import { SEED_DEFS } from "./seeds";

export type AlmanacEntryDef = {
  key: string;
  title: string;
  art: string;
  flavor: string;
  stats?: string;
};

export const ALMANAC_SEED_ENTRIES: AlmanacEntryDef[] = Object.values(SEED_DEFS).map((s) => ({
  key: `seed_${s.spriteKey}`,
  title: s.label,
  art: `/assets/sprites/crops/${s.spriteKey}_3.png`,
  flavor: s.flavor,
  stats: `Cost ${s.hypeCost} Hype · Yield ${s.baseYieldSp} SP · Unlock Lv ${s.unlockLevel}`,
}));

export const ALMANAC_EXTRA: AlmanacEntryDef[] = [
  {
    key: "decor_fence",
    title: "Ticker Fence",
    art: "/assets/sprites/props/fence.png",
    flavor: "Keeps the bears out. Mostly.",
  },
  {
    key: "building_barn",
    title: "Neon Exchange Barn",
    art: "/assets/sprites/buildings/barn.png",
    flavor: "Where candles go to compound.",
  },
];
