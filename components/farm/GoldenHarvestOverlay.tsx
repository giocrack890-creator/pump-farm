"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { playGoldenChime } from "@/components/farm/sounds";
import { useSoundStore } from "@/store/useSoundStore";

export function GoldenHarvestOverlay({
  active,
  onDone,
}: {
  active: boolean;
  onDone?: () => void;
}) {
  const muted = useSoundStore((s) => s.muted);

  useEffect(() => {
    if (!active) return;
    if (!muted) playGoldenChime();
    const t = setTimeout(() => onDone?.(), 2800);
    return () => clearTimeout(t);
  }, [active, onDone, muted]);

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(255,201,77,0.25),transparent_60%)]"
          role="status"
          aria-live="polite"
        >
          <div className="rounded-2xl border border-[#FFC94D]/40 bg-black/70 px-8 py-6 text-center backdrop-blur">
            <p className="font-[family-name:var(--font-display)] text-2xl text-[#FFC94D] sm:text-3xl">
              🌈 GOLDEN HARVEST IS LIVE
            </p>
            <p className="mt-2 text-sm text-white/70">
              All harvests pay 3x for the next 10 minutes!
            </p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
