"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const MUSIC_MUTE_KEY = "pumpfarm_music_muted";

function readMusicMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUSIC_MUTE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeMusicMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MUSIC_MUTE_KEY, String(muted));
  } catch {
    // ignore quota / private mode
  }
}

type SoundState = {
  /** SFX mute — independent of ambient music. */
  muted: boolean;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
  /** Ambient music mute — persisted at `pumpfarm_music_muted`. */
  musicMuted: boolean;
  setMusicMuted: (muted: boolean) => void;
  toggleMusicMuted: () => void;
  /** Target playback volume after unlock (~35%). */
  musicVolume: number;
};

export const useSoundStore = create<SoundState>()(
  persist(
    (set, get) => ({
      muted: false,
      setMuted: (muted) => set({ muted }),
      toggleMuted: () => set({ muted: !get().muted }),
      musicMuted: false,
      setMusicMuted: (musicMuted) => {
        writeMusicMuted(musicMuted);
        set({ musicMuted });
      },
      toggleMusicMuted: () => {
        const musicMuted = !get().musicMuted;
        writeMusicMuted(musicMuted);
        set({ musicMuted });
      },
      musicVolume: 0.35,
    }),
    {
      name: "pump-farm-sound",
      partialize: (s) => ({ muted: s.muted }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.musicMuted = readMusicMuted();
      },
    },
  ),
);

// Hydrate music mute ASAP on client (persist rehydrate is async).
if (typeof window !== "undefined") {
  useSoundStore.setState({ musicMuted: readMusicMuted() });
}

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
  harvest: (tier: "Basic" | "Hybrid" | "Golden" | "Mythic" | string = "Basic") => {
    const base =
      tier === "Mythic" ? 1046 : tier === "Golden" ? 988 : tier === "Hybrid" ? 920 : 880;
    beep(base, 0.08, "square");
    setTimeout(() => beep(base * 1.33, 0.12, "square"), 80);
    if (tier === "Golden" || tier === "Mythic") {
      setTimeout(() => beep(base * 1.6, 0.1, "sine"), 160);
    }
  },
  currencyDing: () => {
    beep(1320, 0.07, "sine");
    setTimeout(() => beep(1560, 0.09, "sine"), 60);
  },
  buy: () => {
    beep(660, 0.08, "triangle");
    setTimeout(() => beep(880, 0.1, "triangle"), 70);
  },
  deny: () => {
    beep(180, 0.12, "sawtooth");
  },
  golden: () => {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => beep(f, 0.15, "sine"), i * 90),
    );
  },
};
