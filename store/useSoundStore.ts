"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type SoundState = {
  muted: boolean;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
};

export const useSoundStore = create<SoundState>()(
  persist(
    (set, get) => ({
      muted: false,
      setMuted: (muted) => set({ muted }),
      toggleMuted: () => set({ muted: !get().muted }),
    }),
    { name: "pump-farm-sound" },
  ),
);

function beep(freq: number, duration = 0.12, type: OscillatorType = "sine") {
  if (typeof window === "undefined") return;
  if (useSoundStore.getState().muted) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // ignore autoplay / AudioContext errors
  }
}

export const sounds = {
  plant: () => beep(420, 0.1, "triangle"),
  harvest: () => {
    beep(880, 0.08, "square");
    setTimeout(() => beep(1175, 0.12, "square"), 80);
  },
  golden: () => {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => beep(f, 0.15, "sine"), i * 90),
    );
  },
};
