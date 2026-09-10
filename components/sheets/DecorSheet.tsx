"use client";

import { DECOR_ITEMS, type DecorItemId, type DecorPlacement } from "@/lib/game/decor";
import { HudBottomSheet } from "@/components/hud/HudBottomSheet";

type Props = {
  open: boolean;
  level: number;
  hype: number;
  placements: DecorPlacement[];
  onClose: () => void;
  onPlace: (itemId: DecorItemId) => void;
};

export function DecorSheet({ open, level, hype, placements, onClose, onPlace }: Props) {
  const owned = new Set(placements.map((p) => p.itemId));

  return (
    <HudBottomSheet
      open={open}
      onClose={onClose}
      title="Decor"
      subtitle="Dress the farm edges — higher levels unlock richer props. Each purchase places a piece on the map."
      ariaLabel="Decorations"
    >
      <p className="mb-3 text-xs text-[#6b3e1f]">
        Placed {placements.length} props · farm looks richer as you level.
      </p>
      <ul className="space-y-2">
        {Object.values(DECOR_ITEMS).map((item) => {
          const locked = level < item.unlockLevel;
          const already = owned.has(item.id);
          const afford = hype >= item.hypeCost;
          return (
            <li
              key={item.id}
              className="flex items-center gap-3 border-[3px] border-[#8b5a2b] bg-[#f6e6c4] p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  item.id === "tree"
                    ? "/assets/sprites/farming-sim/objects/tree.png"
                    : `/assets/sprites/props/${item.id}.png`
                }
                alt=""
                className="h-12 w-12 object-contain [image-rendering:pixelated]"
              />
              <div className="min-w-0 flex-1">
                <p className="font-[family-name:var(--font-pixel)] text-[10px] text-[#4a1e0c]">
                  {item.label}
                </p>
                <p className="text-[11px] text-[#6b3e1f]">
                  {locked
                    ? `Unlocks Farm Level ${item.unlockLevel}`
                    : already
                      ? "Already on your farm"
                      : `${item.hypeCost} Hype to place`}
                </p>
              </div>
              <button
                type="button"
                disabled={locked || already || !afford}
                onClick={() => onPlace(item.id)}
                className="cursor-pointer border-[3px] border-[#6b3e1f] bg-[#3dff7a] px-3 py-2 text-[9px] font-bold text-[#06140c] disabled:opacity-40"
              >
                Place
              </button>
            </li>
          );
        })}
      </ul>
    </HudBottomSheet>
  );
}
