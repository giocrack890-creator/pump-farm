"use client";

import * as React from "react";
import { createContext, useContext, useMemo } from "react";
import { useSoundStore } from "@/store/useSoundStore";
import {
  playGoldenChime,
  playHarvestChime,
  playPlantWhoosh,
} from "@/components/farm/sounds";

type SoundApi = {
  muted: boolean;
  toggleMuted: () => void;
  plant: () => void;
  harvest: () => void;
  golden: () => void;
};

const SoundContext = createContext<SoundApi | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const muted = useSoundStore((s) => s.muted);
  const toggleMuted = useSoundStore((s) => s.toggleMuted);

  const api = useMemo<SoundApi>(
    () => ({
      muted,
      toggleMuted,
      plant: () => {
        if (!muted) playPlantWhoosh();
      },
      harvest: () => {
        if (!muted) playHarvestChime();
      },
      golden: () => {
        if (!muted) playGoldenChime();
      },
    }),
    [muted, toggleMuted],
  );

  return (
    <SoundContext.Provider value={api}>{children}</SoundContext.Provider>
  );
}

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    throw new Error("useSound must be used within SoundProvider");
  }
  return ctx;
}
