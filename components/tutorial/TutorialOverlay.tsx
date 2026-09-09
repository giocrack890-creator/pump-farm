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
  { title: string; body: string; cta?: string; showInstant?: boolean; spotlight?: string }
> = {
  welcome: {
    title: "Welcome to Pump Farm",
    body: "Plant seeds, grow your farm, earn real $FARM from Season Points and the Silo.",
    cta: "Let's farm",
  },
  "tap-plot": {
    title: "Plant your first seed",
    body: "Tap an empty soil plot on your farm (green ring).",
  },
  "pick-seed": {
    title: "Pick a seed",
    body: "Choose Basic — free-tier and unlocked right away.",
  },
  growth: {
    title: "Crops grow in real time",
    body: "Come back later — or instant-grow this one for the tutorial only.",
    cta: "Continue",
    showInstant: true,
  },
  harvest: {
    title: "Harvest!",
    body: "Tap the glowing ready crop. Watch Season Points tick up.",
  },
  xp: {
    title: "Farm Level",
    body: "Every harvest grows Farm Level — unlocking better seeds, land, and a fancier Exchange.",
    cta: "Got it",
    spotlight: "xp",
  },
  silo: {
    title: "The Silo",
    body: "Rewards hold real $FARM from trading fees. Biggest farms each Season get paid.",
    cta: "Nice",
    spotlight: "silo",
  },
  nav: {
    title: "Your tools",
    body: "Silo · Shop · Hire · Almanac · Decor · Friends — bottom bar anytime.",
    cta: "Finish tutorial",
    spotlight: "nav",
  },
  done: {
    title: "You're ready",
    body: "Replay anytime from Menu. Grow green candles.",
    cta: "Start farming",
  },
};

/** Screen-space spotlight holes for HUD chrome steps. */
function Spotlight({ kind }: { kind?: string }) {
  if (!kind) return null;
  const box =
    kind === "xp"
      ? "left-3 top-3 h-24 w-[220px] md:left-4"
      : kind === "silo"
        ? "right-3 top-36 h-20 w-16 md:right-4"
        : kind === "nav"
          ? "inset-x-2 bottom-2 h-16 max-w-xl mx-auto"
          : "";
  if (!box) return null;
  return (
    <div
      className={`pointer-events-none absolute z-[61] rounded-sm ring-4 ring-[#3dff7a] ring-offset-2 ring-offset-transparent ${box}`}
      aria-hidden
    />
  );
}

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
        <Spotlight kind={copy.spotlight} />
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
