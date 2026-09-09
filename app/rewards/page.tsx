"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { SiloMeter } from "@/components/rewards/SiloMeter";
import { PayoutCurveChart } from "@/components/rewards/PayoutCurveChart";
import { StakePanel } from "@/components/rewards/StakePanel";
import { SeasonCountdown } from "@/components/shared/SeasonCountdown";
import { useFarmStore } from "@/store/useFarmStore";
import { formatNumber } from "@/lib/utils";
import { DISCLAIMER } from "@/components/layout/Footer";
import {
  hudInk,
  hudInkLight,
  hudInkMuted,
  hudPanel,
  hudPanelDark,
  hudGold,
} from "@/components/hud/hudChrome";

export default function RewardsPage() {
  const sp = useFarmStore((s) => s.sp);

  const seasonQ = useQuery({
    queryKey: ["season"],
    queryFn: async () => (await fetch("/api/season")).json(),
    refetchInterval: 30_000,
  });

  const pool = Number(seasonQ.data?.pool?.displayBalance ?? 42.5);
  const endsAt = seasonQ.data?.season?.endsAt ?? null;
  const fillPct = Math.min(100, (pool / 100) * 100);
  const projectedShare = Math.max(0, sp) * 0.00015;

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-[#87b8d8] bg-[radial-gradient(ellipse_at_top,#b8d4e8_0%,#87b8d8_45%,#6a9bb8_100%)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 pb-24">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className={`max-w-2xl p-4 ${hudPanel}`}>
            <p className={`text-[11px] ${hudInk}`}>The Silo</p>
            <p className={`mt-2 text-sm leading-relaxed ${hudInkMuted}`}>
              No hidden wallets, no trust-me-bro tokenomics. Every dollar in the Silo came from
              real trading fees, and every payout is on-chain.
            </p>
          </div>
          <Link
            href="/play"
            className={`border-[3px] border-[#3a2414] bg-[#ffe08a] px-4 py-2 text-[10px] font-bold text-[#1a1008] shadow-[3px_3px_0_#1a1008] ${hudInk}`}
          >
            ← Back to farm
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5">
            <SiloMeter poolAmount={pool} fillPct={fillPct || 68} />
            <div className={`p-4 ${hudPanelDark}`}>
              <p className={`text-[10px] ${hudInkLight}`}>Your projected share</p>
              <p className={`mt-2 text-2xl tabular-nums ${hudInkLight}`}>
                ~{formatNumber(projectedShare, 4)}{" "}
                <span className="text-sm text-[#ffe08a]/80">ETH</span>
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[#fff8e8]/65">
                Based on current SP ({formatNumber(sp)}) vs live leaderboard density. Projection
                updates as the season progresses — not a guarantee.
              </p>
              <div className="mt-3">
                <SeasonCountdown endsAt={endsAt} label="Next payout" variant="hud" />
              </div>
            </div>
          </div>
          <div className="space-y-5">
            <PayoutCurveChart />
            <StakePanel />
          </div>
        </div>

        <p className={`mx-auto mt-10 max-w-3xl text-center text-[10px] leading-relaxed ${hudGold}`}>
          {DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
