"use client";

import { useQuery } from "@tanstack/react-query";
import { HudBottomSheet } from "@/components/hud/HudBottomSheet";
import { FeesPoolPanel } from "@/components/rewards/FeesPoolPanel";
import { StakePanel } from "@/components/rewards/StakePanel";
import { useFarmStore } from "@/store/useFarmStore";
import { DISCLAIMER } from "@/components/layout/Footer";

type Props = {
  open: boolean;
  onClose: () => void;
};

/** Season rewards sheet — pot + stake. */
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
  const projectedShare = Math.max(0, sp) * 0.00015;

  return (
    <HudBottomSheet
      open={open}
      onClose={onClose}
      title="Season Rewards"
      subtitle="$FARM fees → pot → paid out when the Season closes."
      ariaLabel="Season rewards"
      maxHeightClass="max-h-[88vh]"
    >
      <div className="space-y-4">
        <FeesPoolPanel
          poolEth={pool}
          yourSp={sp}
          yourProjectedEth={projectedShare}
          endsAt={endsAt}
        />
        <StakePanel />
        <p className="text-[10px] leading-relaxed text-[#5c3a1e]/80">{DISCLAIMER}</p>
      </div>
    </HudBottomSheet>
  );
}
