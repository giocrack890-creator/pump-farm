"use client";

import { motion, AnimatePresence } from "framer-motion";
import { LAND_EXPANSIONS } from "@/lib/game/buildings";

export function ExpandLandSheet({
  open,
  level,
  gridSize,
  hype,
  onClose,
  onConfirm,
}: {
  open: boolean;
  level: number;
  gridSize: number;
  hype: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const next = LAND_EXPANSIONS.find((e) => e.fromSize === gridSize);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close expand"
            className="fixed inset-0 z-40 bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border border-white/10 bg-[#0E1512] p-5 pb-10 shadow-2xl"
            role="dialog"
            aria-label="Expand land"
          >
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-white/20" />
            <h2 className="font-[family-name:var(--font-display)] text-xl text-white">
              Expand land
            </h2>
            {!next ? (
              <p className="mt-3 text-sm text-white/55">Your farm is fully expanded.</p>
            ) : (
              <>
                <p className="mt-2 text-sm text-white/60">
                  Clear a new ring of plots: {next.fromSize}×{next.fromSize} → {next.toSize}×
                  {next.toSize}
                </p>
                <p className="mt-2 text-xs text-[#3DFF7A]">
                  Cost: {next.hypeCost} Hype · Requires Farm Level {next.unlockLevel}
                </p>
                <button
                  type="button"
                  disabled={level < next.unlockLevel || hype < next.hypeCost}
                  onClick={onConfirm}
                  className="mt-5 w-full rounded-2xl bg-[#3DFF7A] py-3 font-semibold text-[#06140C] disabled:opacity-40"
                >
                  Clear land
                </button>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
