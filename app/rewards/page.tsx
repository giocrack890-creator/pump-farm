"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { FeesPoolPanel } from "@/components/rewards/FeesPoolPanel";
import { StakePanel } from "@/components/rewards/StakePanel";
import { useFarmStore } from "@/store/useFarmStore";
import { DISCLAIMER } from "@/components/layout/Footer";
import { hudInk, hudGold } from "@/components/hud/hudChrome";

export default function RewardsPage() {
  const sp = useFarmStore((s) => s.sp);

  const seasonQ = useQuery({
    queryKey: ["season"],
    queryFn: async () => (await fetch("/api/season")).json(),
    refetchInterval: 30_000,
  });

  const pool = Number(seasonQ.data?.pool?.displayBalance ?? 42.5);
  const endsAt = seasonQ.data?.season?.endsAt ?? null;
  const projectedShare = Math.max(0, sp) * 0.00015;

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-[#87b8d8] bg-[radial-gradient(ellipse_at_top,#b8d4e8_0%,#87b8d8_45%,#6a9bb8_100%)]">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 pb-24">
        <div className="mb-4 flex justify-end">
          <Link
            href="/play"
            className={`border-[3px] border-[#3a2414] bg-[#efe0bc] px-4 py-2 text-[10px] font-bold text-[#1a1008] shadow-[3px_3px_0_#1a1008] ${hudInk}`}
          >
            ← Volver a la granja
          </Link>
        </div>
        <FeesPoolPanel
          poolEth={pool}
          yourSp={sp}
          yourProjectedEth={projectedShare}
          endsAt={endsAt}
        />
        <div className="mt-5">
          <StakePanel />
        </div>
        <p className={`mx-auto mt-10 max-w-3xl text-center text-[10px] leading-relaxed ${hudGold}`}>
          {DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
