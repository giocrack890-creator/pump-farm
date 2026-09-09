"use client";

import { create } from "zustand";

type SeasonState = {
  id: string | null;
  number: number;
  endsAt: string | null;
  poolAmount: number;
  setSeason: (s: Partial<SeasonState>) => void;
};

export const useSeasonStore = create<SeasonState>((set) => ({
  id: null,
  number: 1,
  endsAt: null,
  poolAmount: 0,
  setSeason: (s) => set((prev) => ({ ...prev, ...s })),
}));
