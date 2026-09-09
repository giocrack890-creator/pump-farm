"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SEED_DEFS, unlockedSeeds, type SeedTierId } from "@/lib/game/seeds";
import { formatNumber } from "@/lib/utils";

export function PlantPickerSheet({
  open,
  level,
  hype,
  onClose,
  onPlant,
}: {
  open: boolean;
  level: number;
  hype: number;
  onClose: () => void;
  onPlant: (tier: SeedTierId) => void;
}) {
  const seeds = unlockedSeeds(level);
  const locked = Object.values(SEED_DEFS).filter((s) => level < s.unlockLevel);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close plant picker"
            className="fixed inset-0 z-40 bg-black/40"
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
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border border-white/10 bg-[#0E1512] p-5 pb-8 shadow-2xl"
            role="dialog"
            aria-label="Plant a seed"
          >
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-white/20" />
            <h2 className="font-[family-name:var(--font-display)] text-xl text-white">
              Plant a Pump Seed
            </h2>
            <p className="mt-1 text-sm text-white/50">Tap a card — no dropdowns, ever.</p>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
              {seeds.map((s) => {
                const afford = hype >= s.hypeCost;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!afford}
                    onClick={() => onPlant(s.id)}
                    className="min-w-[140px] shrink-0 rounded-2xl border border-[#3DFF7A]/25 bg-black/30 p-3 text-left transition hover:border-[#3DFF7A]/60 disabled:opacity-40"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/assets/sprites/crops/${s.spriteKey}_3.png`}
                      alt={s.label}
                      className="mx-auto h-20 w-16 object-contain"
                    />
                    <p className="mt-2 text-sm font-semibold text-white">{s.label}</p>
                    <p className="text-[11px] text-white/45">{s.flavor}</p>
                    <p className="mt-2 text-xs text-[#3DFF7A]">
                      ⚡ {s.hypeCost} · ◎ {s.baseYieldSp} SP
                    </p>
                    <p className="text-[10px] text-white/40">
                      Grow ~{formatNumber(s.demoGrowMs / 1000, 0)}s (demo)
                    </p>
                  </button>
                );
              })}
              {locked.map((s) => (
                <div
                  key={s.id}
                  className="min-w-[140px] shrink-0 rounded-2xl border border-white/10 bg-black/20 p-3 opacity-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/assets/sprites/crops/${s.spriteKey}_0.png`}
                    alt=""
                    className="mx-auto h-20 w-16 object-contain grayscale"
                  />
                  <p className="mt-2 text-sm text-white/70">{s.label}</p>
                  <p className="text-[11px] text-[#FFC94D]">Unlocks Lvl {s.unlockLevel}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
