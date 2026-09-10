"use client";

import { useMemo } from "react";
import { formatNumber } from "@/lib/utils";
import { HudBottomSheet } from "@/components/hud/HudBottomSheet";
import { DAILY_HYPE_ALLOWANCE } from "@/lib/game/config";
import {
  ANIMAL_SPECIES,
  type AnimalSpeciesId,
  type OwnedAnimal,
} from "@/lib/game/animals";
import { sounds } from "@/store/useSoundStore";

const ink = "font-[family-name:var(--font-pixel)] text-[#4a1e0c]";
const muted = "text-[#6b3e1f]";

export type AnimalsPanelState = {
  roster: OwnedAnimal[];
  hypePerSec: number;
  pendingIdleHype: number;
};

type Props = {
  open: boolean;
  hype: number;
  level: number;
  dailyClaimed?: boolean;
  animals?: AnimalsPanelState | null;
  onClose: () => void;
  onClaimDaily: () => void;
  onBuyAnimal: (speciesId: AnimalSpeciesId) => void;
  onClaimAnimalIdle: () => void;
};

/**
 * Shop — daily Hype faucet + buyable animals that wander the yard.
 */
export function ShopSheet({
  open,
  hype,
  level,
  dailyClaimed = false,
  animals,
  onClose,
  onClaimDaily,
  onBuyAnimal,
  onClaimAnimalIdle,
}: Props) {
  const catalog = useMemo(
    () =>
      Object.values(ANIMAL_SPECIES).sort(
        (a, b) => a.unlockLevel - b.unlockLevel || a.hypeCost - b.hypeCost,
      ),
    [],
  );

  const ownedCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of animals?.roster ?? []) {
      m.set(o.speciesId, (m.get(o.speciesId) ?? 0) + 1);
    }
    return m;
  }, [animals?.roster]);

  const pending = animals?.pendingIdleHype ?? 0;

  return (
    <HudBottomSheet
      open={open}
      onClose={onClose}
      title="Shop"
      subtitle="Daily Hype and farm animals. Animals wander the yard and mint idle Hype."
      ariaLabel="Shop"
      maxHeightClass="max-h-[78vh]"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 border-[2px] border-[#8b5a2b]/40 bg-[#efe0bc] px-3 py-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/icons/hype.png" alt="" className="h-5 w-5" />
        <span className={`text-[11px] tabular-nums ${ink}`}>{formatNumber(hype, 0)} Hype</span>
        {(animals?.hypePerSec ?? 0) > 0 && (
          <span className={`text-[9px] tabular-nums ${muted}`}>
            Animals +{(animals?.hypePerSec ?? 0).toFixed(2)}/s
          </span>
        )}
      </div>

      <div className="border-[3px] border-[#6b3e1f] bg-[#f6e6c4] p-4 shadow-[3px_3px_0_#3a2414]">
        <p className={`text-[11px] ${ink}`}>Daily Hype</p>
        <p className={`mt-1 text-[9px] leading-snug ${muted}`}>
          Claim once per day. Spend Hype on seeds, land expands, hiring workers, and animals.
        </p>
        <button
          type="button"
          disabled={dailyClaimed}
          onClick={() => {
            if (dailyClaimed) {
              sounds.deny();
              return;
            }
            onClaimDaily();
          }}
          className="mt-3 w-full cursor-pointer border-[3px] border-[#1a5c30] bg-[#3dff7a] py-2.5 text-center text-[10px] font-bold text-[#06140c] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:border-[#6b3e1f]/40 disabled:bg-[#d4c4a0] disabled:text-[#6b3e1f]"
        >
          {dailyClaimed ? "Already claimed today" : `Claim +${DAILY_HYPE_ALLOWANCE} Hype`}
        </button>
      </div>

      <div className="mt-4 border-[3px] border-[#6b3e1f] bg-[#f6e6c4] p-3 shadow-[3px_3px_0_#3a2414]">
        <div className="mb-2 flex items-end justify-between gap-2">
          <div>
            <p className={`text-[11px] ${ink}`}>Animals</p>
            <p className={`mt-0.5 text-[8px] leading-snug ${muted}`}>
              Buy once — they roam near the barn and earn idle Hype.
            </p>
          </div>
          <button
            type="button"
            disabled={pending < 0.01}
            onClick={() => {
              if (pending < 0.01) {
                sounds.deny();
                return;
              }
              onClaimAnimalIdle();
            }}
            className="shrink-0 cursor-pointer border-[2px] border-[#1a5c30] bg-[#3dff7a] px-2 py-1.5 text-[8px] font-bold text-[#06140c] disabled:cursor-not-allowed disabled:border-[#6b3e1f]/40 disabled:bg-[#d4c4a0] disabled:text-[#6b3e1f]"
          >
            Claim idle {pending >= 0.01 ? `+${pending.toFixed(2)}` : ""}
          </button>
        </div>

        <div className="grid max-h-[38vh] gap-2 overflow-y-auto pr-0.5">
          {catalog.map((sp) => {
            const locked = level < sp.unlockLevel;
            const canBuy = !locked && hype >= sp.hypeCost;
            const count = ownedCount.get(sp.id) ?? 0;
            return (
              <div
                key={sp.id}
                className={`flex items-center gap-2 border-[2px] border-[#8b5a2b]/45 bg-[#efe0bc] p-2 ${
                  locked ? "opacity-70 grayscale-[0.25]" : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/assets/sprites/animals/${sp.sheet}`}
                  alt=""
                  className="h-10 w-10 shrink-0 object-cover object-left-top [image-rendering:pixelated]"
                  style={{
                    width: 40,
                    height: 40,
                    objectFit: "none",
                    objectPosition: "0 0",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[10px] ${ink}`}>
                    {sp.name}
                    {count > 0 ? (
                      <span className={`ml-1 text-[8px] ${muted}`}>×{count}</span>
                    ) : null}
                  </p>
                  <p className={`truncate text-[7px] leading-snug ${muted}`}>{sp.flavor}</p>
                  <p className={`mt-0.5 text-[8px] tabular-nums ${muted}`}>
                    {sp.hypeCost} Hype · +{sp.hypePerSec.toFixed(2)}/s
                    {locked ? ` · Lv ${sp.unlockLevel}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={locked || !canBuy}
                  onClick={() => {
                    if (locked || !canBuy) {
                      sounds.deny();
                      return;
                    }
                    onBuyAnimal(sp.id);
                  }}
                  className="shrink-0 cursor-pointer border-[2px] border-[#6b3e1f] bg-[#ffd56a] px-2.5 py-1.5 text-[9px] font-bold text-[#4a1e0c] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#d4c4a0] disabled:text-[#6b3e1f]"
                >
                  {locked ? "Locked" : "Buy"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <p className={`mt-3 text-[8px] leading-snug ${muted}`}>
        Need more Hype between claims? Hire workers and use Claim idle in Hire — it includes animal
        idle too.
      </p>
    </HudBottomSheet>
  );
}
