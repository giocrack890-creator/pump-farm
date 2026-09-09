"use client";

import { ALMANAC_SEED_ENTRIES, ALMANAC_EXTRA } from "@/lib/game/almanac";
import { SEED_DEFS } from "@/lib/game/seeds";
import { HudBottomSheet } from "@/components/hud/HudBottomSheet";
import {
  hudAccent,
  hudCardIdle,
  hudInk,
  hudInkMuted,
} from "@/components/hud/hudChrome";

export function AlmanacSheet({
  open,
  level,
  onClose,
}: {
  open: boolean;
  level: number;
  onClose: () => void;
}) {
  const entries = [...ALMANAC_SEED_ENTRIES, ...ALMANAC_EXTRA];

  return (
    <HudBottomSheet
      open={open}
      onClose={onClose}
      title="Almanac"
      subtitle="Crop dex & farm lore — fill it by planting."
      ariaLabel="Almanac"
      maxHeightClass="max-h-[75vh]"
    >
      <ul className="space-y-3">
        {entries.map((e) => {
          const seed = Object.values(SEED_DEFS).find(
            (s) => `seed_${s.spriteKey}` === e.key,
          );
          const locked = seed ? level < seed.unlockLevel : false;
          return (
            <li
              key={e.key}
              className={`flex gap-3 p-3 ${hudCardIdle} ${locked ? "opacity-55" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={e.art}
                alt=""
                className={`h-16 w-14 object-contain [image-rendering:pixelated] ${
                  locked ? "grayscale" : ""
                }`}
              />
              <div>
                <p className={`text-[10px] ${hudInk}`}>{locked ? "???" : e.title}</p>
                <p className={`mt-1 text-xs leading-snug ${hudInkMuted}`}>
                  {locked ? `Unlocks at Farm Level ${seed?.unlockLevel}` : e.flavor}
                </p>
                {!locked && e.stats && (
                  <p className={`mt-1 text-[11px] font-bold ${hudAccent}`}>{e.stats}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </HudBottomSheet>
  );
}
