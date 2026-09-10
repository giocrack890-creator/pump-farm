"use client";

import { motion } from "framer-motion";
import { formatNumber } from "@/lib/utils";
import {
  hudGold,
  hudInk,
  hudInkMuted,
  hudPanel,
} from "@/components/hud/hudChrome";

type Props = {
  poolAmount: number;
  fillPct: number;
  seasonLabel?: string;
  helperText?: string;
};

export function SiloMeter({
  poolAmount,
  fillPct,
  seasonLabel = "Season rewards pot",
  helperText = "How much is in the prize pool right now.",
}: Props) {
  const clamped = Math.min(100, Math.max(0, fillPct));

  return (
    <div className={`overflow-hidden p-4 ${hudPanel}`}>
      <p className={`text-[11px] ${hudInk}`}>{seasonLabel}</p>
      <p className={`mt-1 text-sm ${hudInkMuted}`}>{helperText}</p>
      <div className="mb-4 mt-4 flex items-end justify-between gap-3">
        <div>
          <p className={`text-[10px] ${hudInkMuted}`}>In the pot</p>
          <p className={`text-2xl tabular-nums ${hudInk}`}>
            {formatNumber(poolAmount, 2)}{" "}
            <span className={`text-sm ${hudGold}`}>ETH</span>
          </p>
        </div>
        <span className={`text-sm tabular-nums ${hudGold}`}>{clamped.toFixed(0)}% full</span>
      </div>
      <div className="relative mx-auto h-48 w-28 border-[3px] border-[#3a2414] bg-[#5c3d24] shadow-[4px_4px_0_#1a1008]">
        <div className="absolute inset-x-2 bottom-2 top-5 overflow-hidden border-2 border-[#3a2414]/60">
          <motion.div
            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#c48a20] to-[#ffe08a]"
            initial={{ height: "0%" }}
            animate={{ height: `${clamped}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          />
        </div>
        <div className="absolute -bottom-3 left-1/2 h-3 w-36 -translate-x-1/2 border-2 border-[#3a2414] bg-[#8f6b3e]" />
      </div>
    </div>
  );
}
