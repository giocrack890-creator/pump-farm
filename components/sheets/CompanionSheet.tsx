"use client";

import { companionsUnlocked, COMPANIONS, type CompanionId } from "@/lib/game/companions";
import { LEVEL_GATES } from "@/lib/game/xp";
import { HudBottomSheet } from "@/components/hud/HudBottomSheet";
import {
  hudCardActive,
  hudCardIdle,
  hudInk,
  hudInkMuted,
} from "@/components/hud/hudChrome";

export function CompanionSheet({
  open,
  level,
  activeId,
  onClose,
  onAdopt,
}: {
  open: boolean;
  level: number;
  activeId: string | null;
  onClose: () => void;
  onAdopt: (id: CompanionId) => void;
}) {
  const unlocked = companionsUnlocked(level);
  const locked = level < LEVEL_GATES.companion;

  return (
    <HudBottomSheet
      open={open}
      onClose={onClose}
      title="Companions"
      subtitle={
        locked
          ? `Unlock at Farm Level ${LEVEL_GATES.companion}. Keep harvesting!`
          : "One active companion at a time."
      }
      ariaLabel="Companions"
    >
      {!locked && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {unlocked.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onAdopt(c.id)}
                className={`p-3 text-left ${
                  activeId === c.id ? hudCardActive : hudCardIdle
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.sprite}
                  alt=""
                  className="mx-auto h-16 w-16 object-contain [image-rendering:pixelated]"
                />
                <p className={`mt-2 text-[10px] ${hudInk}`}>{c.name}</p>
                <p className={`mt-1 text-[11px] ${hudInkMuted}`}>{c.flavor}</p>
              </button>
            ))}
          </div>
          <p className={`mt-3 text-[10px] ${hudInkMuted}`}>
            Roster size: {Object.keys(COMPANIONS).length}
          </p>
        </>
      )}
    </HudBottomSheet>
  );
}
