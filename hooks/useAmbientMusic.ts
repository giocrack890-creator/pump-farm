"use client";

import { useEffect, useRef, useState } from "react";
import { useSoundStore } from "@/store/useSoundStore";

const SRC = "/audio/farm-ambient.mp3";
const FADE_MS = 600;
const TARGET_VOLUME = 0.35;
const DUCK_VOLUME = 0.12;

function fadeVolume(
  audio: HTMLAudioElement,
  to: number,
  ms: number,
  cancelRef: { id: number },
): Promise<void> {
  cancelAnimationFrame(cancelRef.id);
  const from = audio.volume;
  if (Math.abs(from - to) < 0.001) {
    audio.volume = to;
    return Promise.resolve();
  }
  const start = performance.now();
  return new Promise((resolve) => {
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      // ease in-out
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      audio.volume = from + (to - from) * e;
      if (t < 1) {
        cancelRef.id = requestAnimationFrame(step);
      } else {
        audio.volume = to;
        resolve();
      }
    };
    cancelRef.id = requestAnimationFrame(step);
  });
}

/**
 * Looping farm BGM for `/play` only.
 * Starts muted until first user gesture; fades on mute; pauses when tab hidden.
 */
export function useAmbientMusic(opts?: { duck?: boolean }) {
  const musicMuted = useSoundStore((s) => s.musicMuted);
  const duck = opts?.duck ?? false;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeCancel = useRef({ id: 0 });
  const unlockedRef = useRef(false);
  const musicMutedRef = useRef(musicMuted);
  const duckRef = useRef(duck);
  const [unlocked, setUnlocked] = useState(false);

  musicMutedRef.current = musicMuted;
  duckRef.current = duck;

  // Create <audio loop> once
  useEffect(() => {
    const audio = new Audio(SRC);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
    audioRef.current = audio;
    return () => {
      cancelAnimationFrame(fadeCancel.current.id);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  // Unlock on first tap/click/key anywhere
  useEffect(() => {
    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      setUnlocked(true);
      const audio = audioRef.current;
      if (!audio) return;

      const start = async () => {
        try {
          await audio.play();
          if (musicMutedRef.current) {
            audio.pause();
            audio.volume = 0;
            return;
          }
          const target = duckRef.current ? DUCK_VOLUME : TARGET_VOLUME;
          await fadeVolume(audio, target, FADE_MS, fadeCancel.current);
        } catch {
          // Autoplay still blocked — wait for another gesture
          unlockedRef.current = false;
          setUnlocked(false);
        }
      };
      void start();
    };

    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Mute / unmute with fade
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !unlockedRef.current) return;

    let cancelled = false;
    const run = async () => {
      if (musicMuted) {
        await fadeVolume(audio, 0, FADE_MS, fadeCancel.current);
        if (!cancelled) audio.pause();
      } else {
        try {
          await audio.play();
          if (cancelled) return;
          const target = duckRef.current ? DUCK_VOLUME : TARGET_VOLUME;
          await fadeVolume(audio, target, FADE_MS, fadeCancel.current);
        } catch {
          /* ignore */
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [musicMuted]);

  // Duck under level-up overlay
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !unlockedRef.current || musicMutedRef.current) return;
    const target = duck ? DUCK_VOLUME : TARGET_VOLUME;
    void fadeVolume(audio, target, FADE_MS, fadeCancel.current);
  }, [duck]);

  // Pause when tab hidden; resume if not user-muted
  useEffect(() => {
    const onVis = () => {
      const audio = audioRef.current;
      if (!audio || !unlockedRef.current) return;
      if (document.hidden) {
        audio.pause();
        return;
      }
      if (musicMutedRef.current) return;
      void audio.play().then(() => {
        const target = duckRef.current ? DUCK_VOLUME : TARGET_VOLUME;
        return fadeVolume(audio, target, FADE_MS, fadeCancel.current);
      });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  /** HUD: muted until unlock, or when user muted music. */
  const showMuted = !unlocked || musicMuted;

  return { unlocked, showMuted };
}
