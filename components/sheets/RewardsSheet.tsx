"use client";

import { useQuery } from "@tanstack/react-query";
import { HudBottomSheet } from "@/components/hud/HudBottomSheet";
import { SiloMeter } from "@/components/rewards/SiloMeter";
import { PayoutCurveChart } from "@/components/rewards/PayoutCurveChart";
import { StakePanel } from "@/components/rewards/StakePanel";
import { SeasonCountdown } from "@/components/shared/SeasonCountdown";
import { useFarmStore } from "@/store/useFarmStore";
import { formatNumber } from "@/lib/utils";
import { DISCLAIMER } from "@/components/layout/Footer";
import { hudInkMuted, hudPanelDark, hudInkLight } from "@/components/hud/hudChrome";

type Props = {
  open: boolean;
  onClose: () => void;
};

/** Silo / Rewards as in-play popup — never navigates away from /play. */
export function RewardsSheet({ open, onClose }: Props) {
  const sp = useFarmStore((s) => s.sp);

  const seasonQ = useQuery({
    queryKey: ["season"],
    queryFn: async () => (await fetch("/api/season")).json(),
    refetchInterval: open ? 30_000 : false,
    enabled: open,
  });

  const pool = Number(seasonQ.data?.pool?.displayBalance ?? 42.5);
  const endsAt = seasonQ.data?.season?.endsAt ?? null;
  const fillPct = Math.min(100, (pool / 100) * 100);
  const projectedShare = Math.max(0, sp) * 0.00015;

  return (
    <HudBottomSheet
      open={open}
      onClose={onClose}
      title="The Silo"
      subtitle="Season pool, projected share, and $FARM stake — stay on the farm."
      ariaLabel="Rewards and Silo"
      maxHeightClass="max-h-[85vh]"
    >
      <div className="space-y-4">
        <SiloMeter poolAmount={pool} fillPct={fillPct || 68} />
        <div className={`p-3 ${hudPanelDark}`}>
          <p className={`text-[10px] ${hudInkLight}`}>Your projected share</p>
          <p className={`mt-1 text-xl tabular-nums ${hudInkLight}`}>
            ~{formatNumber(projectedShare, 4)}{" "}
            <span className="text-sm text-[#ffe08a]/80">ETH</span>
          </p>
          <p className={`mt-1 text-[11px] leading-relaxed ${hudInkMuted}`}>
            Based on current SP ({formatNumber(sp)}). Projection, not a guarantee.
          </p>
          <div className="mt-2">
            <SeasonCountdown endsAt={endsAt} label="Next payout" variant="hud" />
          </div>
        </div>
        <PayoutCurveChart />
        <StakePanel />
        <p className="text-[10px] leading-relaxed text-[#5c3a1e]/80">{DISCLAIMER}</p>
      </div>
    </HudBottomSheet>
  );
}
