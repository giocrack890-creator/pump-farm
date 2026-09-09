"use client";

import { create } from "zustand";

export type ClientPlot = {
  id: string;
  index: number;
  seedTier: string | null;
  plantedAt: string | null;
  maturesAt: string | null;
  status: string;
  progress?: number;
};

type FarmState = {
  plots: ClientPlot[];
  hype: number;
  sp: number;
  /** @deprecated prefer hype */
  hypeBalance: number;
  /** @deprecated prefer sp */
  seasonPoints: number;
  harvestStreak: number;
  referralCode: string | null;
  weather: string;
  goldenHarvestActive: boolean;
  goldenEndsAt: string | null;
  activeStakeBonus: number;
  hypeRate: number;
  loading: boolean;
  syncFromServer: (data: Partial<FarmState> & { plots?: ClientPlot[] }) => void;
  setFromServer: (data: Partial<FarmState> & { plots?: ClientPlot[] }) => void;
  setLoading: (v: boolean) => void;
};

function normalize(data: Partial<FarmState> & { plots?: ClientPlot[] }) {
  const hype =
    data.hype ?? data.hypeBalance ?? undefined;
  const sp = data.sp ?? data.seasonPoints ?? undefined;
  return {
    ...data,
    ...(hype != null ? { hype, hypeBalance: hype } : {}),
    ...(sp != null ? { sp, seasonPoints: sp } : {}),
  };
}

export const useFarmStore = create<FarmState>((set) => ({
  plots: Array.from({ length: 9 }, (_, index) => ({
    id: `plot-${index}`,
    index,
    seedTier: null,
    plantedAt: null,
    maturesAt: null,
    status: "empty",
    progress: 0,
  })),
  hype: 0,
  sp: 0,
  hypeBalance: 0,
  seasonPoints: 0,
  harvestStreak: 0,
  referralCode: null,
  weather: "Sunny",
  goldenHarvestActive: false,
  goldenEndsAt: null,
  activeStakeBonus: 0,
  hypeRate: 0,
  loading: false,
  syncFromServer: (data) => set((s) => ({ ...s, ...normalize(data) })),
  setFromServer: (data) => set((s) => ({ ...s, ...normalize(data) })),
  setLoading: (loading) => set({ loading }),
}));

export type FarmPlot = ClientPlot;
export type SeedTierId = "Basic" | "Hybrid" | "Golden";
