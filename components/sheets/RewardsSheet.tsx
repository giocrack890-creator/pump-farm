"use client";

import { HudBottomSheet } from "@/components/hud/HudBottomSheet";
import { FeesPoolPanel } from "@/components/rewards/FeesPoolPanel";
import { StakePanel } from "@/components/rewards/StakePanel";
import { useFarmStore } from "@/store/useFarmStore";
import { DISCLAIMER } from "@/components/layout/Footer";
import { projectedShareEth, useSeasonPot } from "@/hooks/useSeasonPot";

type Props = {
  open: boolean;
  onClose: () => void;
};

/** Season rewards sheet — pot + stake. */
export function RewardsSheet({ open, onClose }: Props) {
  const sp = useFarmStore((s) => s.sp);

  const { pot, endsAt, isLoading } = useSeasonPot({ enabled: open });

  return (
    <HudBottomSheet
      open={open}
      onClose={onClose}
      title="Season Rewards"
      subtitle="$HOOD fees → pot → paid out when the Season closes."
      ariaLabel="Season rewards"
      maxHeightClass="max-h-[88vh]"
    >
      <div className="space-y-4">
        <FeesPoolPanel
          poolEth={pot.eth}
          ethUsd={pot.ethUsd}
          claimableEth={pot.claimableEth}
          pendingEth={pot.pendingEth}
          treasuryEth={pot.treasuryEth}
          siloTarget={pot.siloTargetEth}
          stale={pot.stale}
          reason={pot.reason}
          loading={isLoading}
          yourSp={sp}
          yourProjectedEth={projectedShareEth(pot.eth, sp)}
          endsAt={endsAt}
        />
        <StakePanel />
        <p className="text-[10px] leading-relaxed text-[#5c3a1e]/80">{DISCLAIMER}</p>
      </div>
    </HudBottomSheet>
  );
}
