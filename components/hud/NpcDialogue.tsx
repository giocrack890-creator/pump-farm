"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export type NpcId = "foreman" | "pierre" | "chick";

const PORTRAIT: Record<NpcId, string> = {
  foreman: "/assets/sprites/farming-sim/objects/farmer.png",
  pierre: "/assets/sprites/companions/pet.png",
  chick: "/assets/sprites/farming-sim/objects/chicken.png",
};

const NAME: Record<NpcId, string> = {
  foreman: "Foreman",
  pierre: "Pierre",
  chick: "Clucky",
};

/**
 * Tip bubble sits at the bottom-left (never over the field center).
 * Wrapper is pointer-events-none so plot taps always reach Phaser;
 * only the small dismiss chip captures clicks.
 */
export function NpcDialogue({
  tip,
  onDismiss,
}: {
  tip: { npc: NpcId; text: string } | null;
  onDismiss: () => void;
}) {
  const reduce = useReducedMotion();
  if (!tip) return null;

  return (
    <div className="pointer-events-none absolute bottom-[5.75rem] left-3 z-20 w-[min(72vw,280px)] md:bottom-28 md:left-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${tip.npc}-${tip.text}`}
          initial={reduce ? false : { y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? undefined : { y: 6, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-end gap-2 border-[3px] border-[#3a2414] bg-[#fff8e8] p-2 shadow-[4px_4px_0_#1a1008]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border-[3px] border-[#3a2414] bg-[#c9a46a]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={PORTRAIT[tip.npc]}
              alt=""
              className="h-10 w-10 object-contain [image-rendering:pixelated]"
            />
          </div>
          <div className="min-w-0 flex-1 pb-0.5">
            <p className="font-[family-name:var(--font-pixel)] text-[9px] text-[#8a5a10]">
              {NAME[tip.npc]}
            </p>
            <p className="mt-0.5 font-[family-name:var(--font-pixel)] text-[10px] leading-snug text-[#1a1008]">
              {tip.text}
            </p>
            <button
              type="button"
              onClick={onDismiss}
              className="pointer-events-auto mt-1.5 cursor-pointer border-2 border-[#3a2414] bg-[#efe0bc] px-2 py-0.5 text-[8px] font-bold text-[#3a2414] hover:brightness-105"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export const NPC_TAP_LINES: Record<NpcId, string> = {
  foreman: "Need hands? Open Hire — pick a farmer, Deploy, and they'll auto-harvest.",
  pierre: "Empty beds? Tap soil → Seed tray. Shop is for daily Hype.",
  chick: "Daily quest: harvest 3 crops. Claim daily Hype in the Shop!",
};
