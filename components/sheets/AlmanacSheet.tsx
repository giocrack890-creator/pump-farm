"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ALMANAC_SEED_ENTRIES, ALMANAC_EXTRA } from "@/lib/game/almanac";
import { SEED_DEFS } from "@/lib/game/seeds";

export function AlmanacSheet({
  open,
  level,
  onClose,
}: {
  open: boolean;
  level: number;
  onClose: () => void;
}) {
  const entries = [...ALMANAC_SEED_ENTRIES, ...ALMANAC_EXTRA];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close almanac"
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
            className="fixed inset-x-0 bottom-0 z-50 max-h-[75vh] overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0E1512] p-5 pb-10 shadow-2xl"
            role="dialog"
            aria-label="Almanac"
          >
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-white/20" />
            <h2 className="font-[family-name:var(--font-display)] text-xl text-white">Almanac</h2>
            <p className="mt-1 text-sm text-white/50">Crop dex & farm lore — fill it by planting.</p>
            <ul className="mt-4 space-y-3">
              {entries.map((e) => {
                const seed = Object.values(SEED_DEFS).find(
                  (s) => `seed_${s.spriteKey}` === e.key,
                );
                const locked = seed ? level < seed.unlockLevel : false;
                return (
                  <li
                    key={e.key}
                    className={`flex gap-3 rounded-2xl border border-white/10 bg-black/25 p-3 ${
                      locked ? "opacity-45" : ""
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={e.art}
                      alt=""
                      className={`h-16 w-14 object-contain ${locked ? "grayscale" : ""}`}
                    />
                    <div>
                      <p className="font-semibold text-white">
                        {locked ? "???" : e.title}
                      </p>
                      <p className="mt-1 text-xs text-white/55">
                        {locked ? `Unlocks at Farm Level ${seed?.unlockLevel}` : e.flavor}
                      </p>
                      {!locked && e.stats && (
                        <p className="mt-1 text-[11px] text-[#3DFF7A]">{e.stats}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
