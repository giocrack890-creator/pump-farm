"use client";

import { motion, AnimatePresence } from "framer-motion";
import { companionsUnlocked, COMPANIONS, type CompanionId } from "@/lib/game/companions";
import { LEVEL_GATES } from "@/lib/game/xp";

export function CompanionSheet({
  open,
  level,
  activeId,
  onClose,
  onAdopt,
}: {
  open: boolean;
  level: number;
  activeId: string | null;
  onClose: () => void;
  onAdopt: (id: CompanionId) => void;
}) {
  const unlocked = companionsUnlocked(level);
  const locked = level < LEVEL_GATES.companion;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close companions"
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
            aria-label="Companions"
          >
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-white/20" />
            <h2 className="font-[family-name:var(--font-display)] text-xl text-white">
              Companions
            </h2>
            {locked ? (
              <p className="mt-3 text-sm text-white/55">
                Unlock at Farm Level {LEVEL_GATES.companion}. Keep harvesting!
              </p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {unlocked.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onAdopt(c.id)}
                    className={`rounded-2xl border p-3 text-left ${
                      activeId === c.id
                        ? "border-[#3DFF7A]/60 bg-[#3DFF7A]/10"
                        : "border-white/10 bg-black/25"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.sprite} alt="" className="mx-auto h-16 w-16 object-contain" />
                    <p className="mt-2 text-sm font-semibold text-white">{c.name}</p>
                    <p className="text-[11px] text-white/50">{c.flavor}</p>
                  </button>
                ))}
              </div>
            )}
            {!locked && (
              <p className="mt-3 text-[11px] text-white/40">
                Roster size: {Object.keys(COMPANIONS).length} · one active companion at a time
              </p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
