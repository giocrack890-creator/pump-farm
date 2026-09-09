"use client";

import { SEED_DEFS, unlockedSeeds, type SeedTierId } from "@/lib/game/seeds";
import { formatNumber } from "@/lib/utils";
import { HudBottomSheet } from "@/components/hud/HudBottomSheet";

/** Stardew parchment cards override for plant picker. */
const cardOn =
  "border-[3px] border-[#1a5c30] bg-[#f6e6c4] shadow-[3px_3px_0_#3a2414]";
const cardLock =
  "border-[3px] border-[#8b5a2b]/60 bg-[#efe0bc]/70 opacity-75";
const ink = "font-[family-name:var(--font-pixel)] text-[#4a1e0c]";
const muted = "text-[#6b3e1f]";

export function PlantPickerSheet({
  open,
  level,
  hype,
  onClose,
  onPlant,
}: {
  open: boolean;
  level: number;
  hype: number;
  onClose: () => void;
  onPlant: (tier: SeedTierId) => void;
}) {
  const seeds = unlockedSeeds(level);
  const locked = Object.values(SEED_DEFS).filter((s) => level < s.unlockLevel);

  return (
    <HudBottomSheet
      open={open}
      onClose={onClose}
      title="Plant a Pump Seed"
      subtitle="Tap a card — no dropdowns, ever."
      ariaLabel="Plant a seed"
    >
      <div className="flex gap-3 overflow-x-auto pb-2">
        {seeds.map((s) => {
          const afford = hype >= s.hypeCost;
          return (
            <button
              key={s.id}
              type="button"
              disabled={!afford}
              onClick={() => onPlant(s.id)}
              className={`min-w-[148px] shrink-0 p-3 text-left transition disabled:opacity-40 ${cardOn}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/assets/sprites/crops/${s.spriteKey}_3.png`}
                alt={s.label}
                className="mx-auto h-20 w-16 object-contain [image-rendering:pixelated]"
              />
              <p className={`mt-2 text-[10px] ${ink}`}>{s.label}</p>
              <p className={`mt-1 text-[11px] leading-snug ${muted}`}>{s.flavor}</p>
              <p className="mt-2 text-xs font-bold text-[#1a5c30]">
                ⚡ {s.hypeCost} · ◎ {s.baseYieldSp} SP
              </p>
              <p className={`text-[10px] ${muted}`}>
                Grow ~{formatNumber(s.demoGrowMs / 1000, 0)}s (demo)
              </p>
            </button>
          );
        })}
        {locked.map((s) => (
          <div key={s.id} className={`min-w-[148px] shrink-0 p-3 ${cardLock}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/assets/sprites/crops/${s.spriteKey}_0.png`}
              alt=""
              className="mx-auto h-20 w-16 object-contain grayscale [image-rendering:pixelated]"
            />
            <p className={`mt-2 text-[10px] ${ink}`}>{s.label}</p>
            <p className="mt-1 text-[11px] font-semibold text-[#8a5a10]">
              Unlocks Lvl {s.unlockLevel}
            </p>
          </div>
        ))}
      </div>
    </HudBottomSheet>
  );
}
