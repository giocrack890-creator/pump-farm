"use client";

import { useQuery } from "@tanstack/react-query";
import { SiloMeter } from "@/components/rewards/SiloMeter";
import { PayoutCurveChart } from "@/components/rewards/PayoutCurveChart";
import { StakePanel } from "@/components/rewards/StakePanel";
import { SeasonCountdown } from "@/components/shared/SeasonCountdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFarmStore } from "@/store/useFarmStore";
import { formatNumber } from "@/lib/utils";

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
    <div className="mx-auto w-full max-w-6xl px-4 pb-24">
      <div className="mb-8 max-w-3xl space-y-3">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[#FFC94D] md:text-4xl">
          The Silo
        </h1>
        <p className="text-base leading-relaxed text-white/60">
          No hidden wallets, no trust-me-bro tokenomics. Every dollar in the Silo
          came from real trading fees, and every payout is on-chain. Check for
          yourself →
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <SiloMeter poolAmount={pool} fillPct={fillPct || 68} />
          <Card>
            <CardHeader>
              <CardTitle>Your projected share</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-[family-name:var(--font-display)] text-3xl tabular-nums text-[#FFC94D]">
                ~{formatNumber(projectedShare, 4)} ETH
              </p>
              <p className="text-sm text-white/50">
                Based on current SP ({formatNumber(sp)}) vs live leaderboard
                density. Projection updates as the season progresses — not a
                guarantee.
              </p>
              <SeasonCountdown endsAt={endsAt} label="Next payout" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <PayoutCurveChart />
          <StakePanel />
        </div>
      </div>
    </div>
  );
}
