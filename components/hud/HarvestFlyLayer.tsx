"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { sounds } from "@/store/useSoundStore";

export type FlyFx = {
  id: string;
  kind: "sp" | "hype";
  amount: number;
  from: { x: number; y: number };
};

/**
 * Currency icon flies from harvest point → HUD pill, then dings.
 * Does not block input (pointer-events: none).
 */
export function HarvestFlyLayer({
  items,
  onDone,
}: {
  items: FlyFx[];
  onDone: (id: string) => void;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      <AnimatePresence>
        {items.map((fx) => (
          <FlyIcon key={fx.id} fx={fx} reduce={Boolean(reduce)} onDone={onDone} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function FlyIcon({
  fx,
  reduce,
  onDone,
}: {
  fx: FlyFx;
  reduce: boolean;
  onDone: (id: string) => void;
}) {
  const target =
    typeof document !== "undefined"
      ? document.getElementById(fx.kind === "sp" ? "hud-sp-pill" : "hud-hype-pill")
      : null;
  const rect = target?.getBoundingClientRect();
  const toX = rect ? rect.left + rect.width / 2 : window.innerWidth - 72;
  const toY = rect ? rect.top + rect.height / 2 : 48;

  useEffect(() => {
    if (reduce) {
      onDone(fx.id);
      return;
    }
    const t = window.setTimeout(() => {
      sounds.currencyDing();
      onDone(fx.id);
      target?.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.14)" },
          { transform: "scale(1)" },
        ],
        { duration: 280, easing: "ease-out" },
      );
    }, 520);
    return () => window.clearTimeout(t);
  }, [fx.id, onDone, reduce, target]);

  if (reduce) return null;

  const icon = fx.kind === "sp" ? "/assets/sprites/ui/hud/icon_coin.png" : "/assets/sprites/ui/hud/icon_hype.png";

  return (
    <motion.div
      className="absolute flex items-center gap-1 rounded-full border-2 border-[#3a2414] bg-[#fff8e8] px-1.5 py-0.5 shadow-[2px_2px_0_#1a1008]"
      initial={{ left: fx.from.x, top: fx.from.y, opacity: 1, scale: 0.7, x: "-50%", y: "-50%" }}
      animate={{ left: toX, top: toY, opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={icon} alt="" className="h-5 w-5 [image-rendering:pixelated]" />
      <span className="font-[family-name:var(--font-pixel)] text-[9px] text-[#3a2414]">
        +{fx.amount}
      </span>
    </motion.div>
  );
}
