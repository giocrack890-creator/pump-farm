"use client";

import { motion } from "framer-motion";
import { formatNumber } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  poolAmount: number;
  fillPct: number;
  seasonLabel?: string;
};

export function SiloMeter({
  poolAmount,
  fillPct,
  seasonLabel = "This Season's Silo",
}: Props) {
  const clamped = Math.min(100, Math.max(0, fillPct));

  return (
    <Card className="glow-green overflow-hidden">
      <CardHeader>
        <CardTitle className="text-gold">{seasonLabel}</CardTitle>
        <CardDescription>
          Live fee pool funded by real $FARM trading activity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-end justify-between gap-3">
          <p className="font-display text-3xl text-foreground tabular-nums">
            {formatNumber(poolAmount, 2)}{" "}
            <span className="text-base text-muted">ETH</span>
          </p>
          <span className="text-sm text-gold tabular-nums">{clamped.toFixed(0)}% full</span>
        </div>
        <div className="relative mx-auto h-48 w-28 rounded-b-none rounded-t-[2.5rem] border border-gold/30 bg-black/40">
          <div className="absolute inset-x-2 bottom-2 top-6 overflow-hidden rounded-t-[2rem]">
            <motion.div
              className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#e0a830] to-gold"
              initial={{ height: "0%" }}
              animate={{ height: `${clamped}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
              style={{
                boxShadow: "0 0 30px rgba(255,201,77,0.45)",
              }}
            />
          </div>
          <div className="absolute -bottom-3 left-1/2 h-3 w-36 -translate-x-1/2 rounded-full bg-white/10" />
        </div>
      </CardContent>
    </Card>
  );
}
