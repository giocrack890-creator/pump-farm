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
    title: "Welcome to Hood Harvest",
    body: "Plant, harvest, and earn Season Points (SP). When the Season ends, your SP claim a share of the rewards pot.",
    cta: "Let's go",
  },
  "tap-plot": {
    title: "Plant your first seed",
    body: "Tap an empty soil bed (soft glow) inside the fenced field.",
  },
  "pick-seed": {
    title: "Pick a seed",
    body: "Start with Turnip (Basic) — unlocked at Farm Level 1.",
  },
  growth: {
    title: "Crops grow in real time",
    body: "Come back later — or speed this one up for the tutorial.",
    cta: "Continue",
    showInstant: true,
  },
  harvest: {
    title: "Harvest!",
    body: "Tap the ready crop. You earn Season Points (SP).",
  },
  xp: {
    title: "Farm Level",
    body: "Every harvest raises your level: better seeds, more land, and farm upgrades.",
    cta: "Got it",
    spotlight: "xp",
  },
  silo: {
    title: "Rewards pot",
    body: "The Season Pot is the prize pool. More SP = a bigger share when the Season closes. Open it from Rewards.",
    cta: "OK",
    spotlight: "silo",
  },
  nav: {
    title: "Your tools",
    body: "Rewards · Shop · Hire · Book · Friends — bottom bar. Hire workers to auto-farm.",
    cta: "Finish tutorial",
    spotlight: "nav",
  },
  done: {
    title: "You're set",
    body: "Replay the tutorial anytime from Menu. Go harvest.",
    cta: "To the farm",
  },
};

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
  const copy = COPY[step];
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    const t = setTimeout(() => setReady(true), 200);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-3 pb-24 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Spotlight kind={copy.spotlight} />
          <motion.div
            className={`relative z-[62] w-full max-w-md origin-center p-4 ${hudPanel}`}
            initial={{ y: 24, opacity: 0, scale: 0.92 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
          >
            {step === "welcome" && (
              <div className="mb-3 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/sprites/companions/farmer.png"
                  alt=""
                  className="h-16 w-16 object-contain motion-safe:animate-[pf-bob_2.4s_ease-in-out_infinite] [image-rendering:pixelated]"
                  draggable={false}
                />
              </div>
            )}
            <p className={`text-[13px] ${hudInk}`}>{copy.title}</p>
            <p className={`mt-2 text-sm leading-relaxed ${hudInkMuted}`}>{copy.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {copy.showInstant && (
                <button type="button" className={hudBtnSecondary} onClick={onInstantGrow}>
                  Instant grow
                </button>
              )}
              <button
                type="button"
                className={hudBtnPrimary}
                disabled={!ready}
                onClick={onNext}
              >
                {copy.cta ?? "Next"}
              </button>
              <button type="button" className={`text-[10px] underline ${hudInkMuted}`} onClick={onSkip}>
                Skip tutorial
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
