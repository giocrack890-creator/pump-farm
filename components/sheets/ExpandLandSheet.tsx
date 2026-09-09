"use client";

import { LAND_EXPANSIONS } from "@/lib/game/buildings";
import { HudBottomSheet } from "@/components/hud/HudBottomSheet";
import {
  hudAccent,
  hudBtnPrimary,
  hudInkMuted,
} from "@/components/hud/hudChrome";

export function ExpandLandSheet({
  open,
  level,
  gridSize,
  hype,
  onClose,
  onConfirm,
}: {
  open: boolean;
  level: number;
  gridSize: number;
  hype: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const next = LAND_EXPANSIONS.find((e) => e.fromSize === gridSize);

  return (
    <HudBottomSheet
      open={open}
      onClose={onClose}
      title="Expand land"
      subtitle={
        next
          ? `Clear a new ring of plots: ${next.fromSize}×${next.fromSize} → ${next.toSize}×${next.toSize}`
          : "Your farm is fully expanded."
      }
      ariaLabel="Expand land"
    >
      {next && (
        <>
          <p className={`text-xs font-bold ${hudAccent}`}>
            Cost: {next.hypeCost} Hype · Requires Farm Level {next.unlockLevel}
          </p>
          <button
            type="button"
            disabled={level < next.unlockLevel || hype < next.hypeCost}
            onClick={onConfirm}
            className={`mt-5 w-full ${hudBtnPrimary}`}
          >
            Clear land
          </button>
          {(level < next.unlockLevel || hype < next.hypeCost) && (
            <p className={`mt-2 text-[11px] ${hudInkMuted}`}>
              Need more Hype or a higher Farm Level.
            </p>
          )}
        </>
      )}
    </HudBottomSheet>
  );
}
