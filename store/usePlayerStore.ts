"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { xpProgress, levelFromXp } from "@/lib/game/xp";

type PlayerState = {
  xp: number;
  level: number;
  gridSize: number;
  barnTier: 1 | 2 | 3;
  companionId: string | null;
  questHarvestToday: number;
  setXp: (xp: number) => void;
  addXp: (amount: number) => { leveled: boolean; level: number };
  setGridSize: (n: number) => void;
  setBarnTier: (t: 1 | 2 | 3) => void;
  bumpQuestHarvest: () => void;
  setCompanionId: (id: string | null) => void;
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      xp: 0,
      level: 1,
      gridSize: 3,
      barnTier: 1,
      companionId: null,
      questHarvestToday: 0,
      setXp: (xp) => set({ xp, level: levelFromXp(xp) }),
      addXp: (amount) => {
        const xp = get().xp + amount;
        const prev = get().level;
        const level = levelFromXp(xp);
        set({ xp, level });
        return { leveled: level > prev, level };
      },
      setGridSize: (gridSize) => set({ gridSize }),
      setBarnTier: (barnTier) => set({ barnTier }),
      bumpQuestHarvest: () =>
        set({ questHarvestToday: get().questHarvestToday + 1 }),
      setCompanionId: (companionId) => set({ companionId }),
    }),
    { name: "pump-farm-player" },
  ),
);

export function useXpBar() {
  const xp = usePlayerStore((s) => s.xp);
  return xpProgress(xp);
}
