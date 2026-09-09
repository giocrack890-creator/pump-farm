"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    title: "Plant a Pump Seed",
    body: "Pick an empty plot and spend a little Hype to plant. Growth happens in real time.",
  },
  {
    title: "Watch it candle up",
    body: "Your crop grows into a harvestable green candle. Come back when the plot glows.",
  },
  {
    title: "Harvest Season Points",
    body: "Harvest for Season Points. Climb the leaderboard — the Silo pays real $FARM fees weekly.",
  },
];

export function OnboardingTutorial() {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("pump-farm-tutorial-done")) setOpen(true);
  }, []);

  const close = () => {
    localStorage.setItem("pump-farm-tutorial-done", "1");
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="pointer-events-auto fixed bottom-6 right-6 z-40 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-[#3DFF7A]/25 bg-[#0B0F0E]/95 p-4 shadow-2xl backdrop-blur"
          role="dialog"
          aria-label="Onboarding tutorial"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-[#3DFF7A]/80">
              Tip {step + 1}/3
            </p>
            <button type="button" className="text-xs text-white/40 hover:text-white" onClick={close}>
              Skip
            </button>
          </div>
          <h3 className="font-[family-name:var(--font-display)] text-lg text-white">
            {STEPS[step].title}
          </h3>
          <p className="mt-1 text-sm text-white/60">{STEPS[step].body}</p>
          <div className="mt-4 flex justify-end gap-2">
            {step < 2 ? (
              <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                Next
              </Button>
            ) : (
              <Button size="sm" onClick={close}>
                Let&apos;s farm
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
