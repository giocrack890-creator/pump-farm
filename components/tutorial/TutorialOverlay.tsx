"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  hudBtnPrimary,
  hudBtnSecondary,
  hudInk,
  hudInkMuted,
  hudPanel,
} from "@/components/hud/hudChrome";

export type TutorialStepId =
  | "welcome"
  | "tap-plot"
  | "pick-seed"
  | "growth"
  | "harvest"
  | "xp"
  | "silo"
  | "nav"
  | "done";

type Props = {
  open: boolean;
  step: TutorialStepId;
  onSkip: () => void;
  onNext: () => void;
  onInstantGrow: () => void;
};

const COPY: Record<
  TutorialStepId,
  { title: string; body: string; cta?: string; showInstant?: boolean }
> = {
  welcome: {
    title: "Welcome to Pump Farm",
    body: "Plant seeds, grow your farm, earn Season Points — and compete for real $FARM from the Silo.",
    cta: "Let's farm",
  },
  "tap-plot": {
    title: "Plant your first seed",
    body: "Tap an empty soil plot on your farm.",
  },
  "pick-seed": {
    title: "Pick a seed",
    body: "Choose Basic — it's free-tier and unlocks right away.",
  },
  growth: {
    title: "Crops grow in real time",
    body: "Normally you'd wait (or come back later). For this tutorial only, you can instant-grow this crop.",
    cta: "Continue",
    showInstant: true,
  },
  harvest: {
    title: "Harvest!",
    body: "Tap the glowing ready crop to harvest. Watch Season Points tick up.",
  },
  xp: {
    title: "Farm Level",
    body: "Every harvest also grows Farm Level. Leveling unlocks better seeds, bigger land, and a fancier Exchange.",
    cta: "Got it",
  },
  silo: {
    title: "The Silo",
    body: "Rewards hold real $FARM from trading fees. Biggest farms each Season get paid. Check Rewards anytime.",
    cta: "Nice",
  },
  nav: {
    title: "Your tools",
    body: "Silo · Shop · Pets · Almanac · Decor · Friends — tap the bottom bar anytime.",
    cta: "Finish tutorial",
  },
  done: {
    title: "You're ready",
    body: "Replay anytime from the Menu. Grow green candles.",
    cta: "Start farming",
  },
};

export function TutorialOverlay({ open, step, onSkip, onNext, onInstantGrow }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !open) return null;

  const copy = COPY[step];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="pointer-events-none fixed inset-0 z-[60]"
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="pointer-events-auto absolute inset-x-4 bottom-28 mx-auto max-w-md md:bottom-32">
          <div className={`p-4 ${hudPanel}`}>
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className={`text-[11px] ${hudInk}`}>{copy.title}</p>
              <button
                type="button"
                onClick={onSkip}
                className={`cursor-pointer text-[10px] font-semibold underline ${hudInkMuted}`}
              >
                Skip
              </button>
            </div>
            <p className={`text-sm leading-relaxed ${hudInkMuted}`}>{copy.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {copy.showInstant && (
                <button type="button" onClick={onInstantGrow} className={hudBtnPrimary}>
                  Instant-grow (tutorial only)
                </button>
              )}
              {copy.cta && (
                <button type="button" onClick={onNext} className={hudBtnSecondary}>
                  {copy.cta}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
