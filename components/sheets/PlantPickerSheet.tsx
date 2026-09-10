"use client";

import { useEffect, useRef, useState } from "react";
import { SEED_DEFS, unlockedSeeds, type SeedTierId } from "@/lib/game/seeds";
import { formatNumber } from "@/lib/utils";
import { HudBottomSheet } from "@/components/hud/HudBottomSheet";
import { sounds } from "@/store/useSoundStore";

const packetBase =
  "group relative flex flex-col overflow-hidden border-[3px] border-[#6b3e1f] bg-[#f3e2bc] shadow-[3px_3px_0_#3a2414] transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#3a2414] active:scale-[0.98]";
const packetAfford =
  "motion-safe:animate-[pf-afford_2.6s_ease-in-out_infinite] ring-2 ring-[#3dff7a]/55";
const packetLock =
  "relative flex flex-col overflow-hidden border-[3px] border-[#8b5a2b]/50 bg-[#e8d5a8]/80 opacity-70 grayscale-[0.35]";
const ink = "font-[family-name:var(--font-pixel)] text-[#4a1e0c]";
const muted = "text-[#6b3e1f]";

const TIER_ACCENT: Record<SeedTierId, string> = {
  Basic: "bg-[#7bb85c]",
  Hybrid: "bg-[#e8a04a]",
  Golden: "bg-[#e6c84a]",
  Mythic: "bg-[#c46bde]",
};

const SEEN_SEEDS_KEY = "pumpfarm_seen_seeds_v1";

function readSeenSeeds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_SEEDS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSeenSeeds(ids: Set<string>) {
  try {
    window.localStorage.setItem(SEEN_SEEDS_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

function cropArt(spriteKey: string, stage: 0 | 3) {
  return `/assets/sprites/farming-sim/crops/${spriteKey}/${stage}.png`;
}

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
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const shakeTimer = useRef(0);

  useEffect(() => {
    if (open) setSeen(readSeenSeeds());
  }, [open]);

  const handleClose = () => {
    const unlocked = seeds.map((s) => s.id);
    const merged = new Set([...readSeenSeeds(), ...unlocked]);
    writeSeenSeeds(merged);
    setSeen(merged);
    onClose();
  };

  const tryPlant = (id: SeedTierId, cost: number) => {
    if (hype < cost) {
      sounds.deny();
      setShakeId(id);
      window.clearTimeout(shakeTimer.current);
      shakeTimer.current = window.setTimeout(() => setShakeId(null), 420);
      return;
    }
    sounds.buy();
    onPlant(id);
  };

  return (
    <HudBottomSheet
      open={open}
      onClose={handleClose}
      title="Seed tray"
      subtitle="Pick a packet — plants into the highlighted tilled bed."
      ariaLabel="Plant a seed"
      maxHeightClass="max-h-[82vh]"
    >
      <div className="mb-3 flex items-center gap-2 border-[2px] border-[#8b5a2b]/40 bg-[#efe0bc] px-3 py-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/icons/hype.png" alt="" className="h-5 w-5" />
        <span className={`text-[11px] tabular-nums ${ink}`}>{formatNumber(hype, 0)} Hype</span>
        <span className={`ml-auto text-[9px] ${muted}`}>Tap empty soil → choose seed</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {seeds.map((s) => {
          const afford = hype >= s.hypeCost;
          const shaking = shakeId === s.id;
          const isNew = !seen.has(s.id) && s.id !== "Basic";
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => tryPlant(s.id, s.hypeCost)}
              className={`${packetBase} ${afford ? packetAfford : "opacity-70 saturate-50"} ${
                shaking ? "motion-safe:animate-[pf-shake_0.4s_ease-in-out]" : ""
              }`}
            >
              {isNew && (
                <span className="absolute right-1 top-1 z-10 border-2 border-[#3a2414] bg-[#ff4d4d] px-1 text-[7px] font-bold text-white">
                  NEW
                </span>
              )}
              <div className={`h-1.5 w-full ${TIER_ACCENT[s.id]}`} />
              <div className="flex flex-1 flex-col items-center px-2 pb-3 pt-2">
                <div className="relative flex h-24 w-full items-end justify-center bg-[linear-gradient(180deg,#cfe8a8_0%,#9bc86a_55%,#8a6a3a_56%,#b8925a_100%)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cropArt(s.spriteKey, 3)}
                    alt={s.label}
                    className="mb-1 h-[72px] w-[72px] object-contain drop-shadow-[2px_2px_0_rgba(0,0,0,0.25)] [image-rendering:pixelated]"
                  />
                </div>
                <p className={`mt-2 text-center text-[10px] leading-tight ${ink}`}>{s.label}</p>
                <p className={`mt-1 line-clamp-2 text-center text-[9px] leading-snug ${muted}`}>
                  {s.flavor}
                </p>
                <div className="mt-2 flex w-full items-center justify-between gap-1 border-t-2 border-[#8b5a2b]/30 pt-2">
                  <span
                    className={`text-[10px] font-bold ${
                      shaking ? "text-[#a8433a]" : "text-[#1a5c30]"
                    }`}
                  >
                    ⚡ {s.hypeCost}
                  </span>
                  <span className={`text-[9px] ${muted}`}>◎ {s.baseYieldSp} SP</span>
                </div>
                <p className={`mt-1 text-[8px] ${muted}`}>
                  ~{formatNumber(s.demoGrowMs / 1000, 0)}s grow
                </p>
                <span
                  className={`mt-2 w-full border-[2px] py-1.5 text-center text-[9px] font-bold ${
                    afford
                      ? "border-[#1a5c30] bg-[#3dff7a] text-[#06140c]"
                      : "border-[#6b3e1f]/40 bg-[#d4c4a0] text-[#6b3e1f]"
                  }`}
                >
                  {afford ? "Plant" : "Need Hype"}
                </span>
              </div>
            </button>
          );
        })}

        {locked.map((s) => (
          <div key={s.id} className={packetLock}>
            <div className="h-1.5 w-full bg-[#8b5a2b]/40" />
            <div className="flex flex-col items-center px-2 pb-3 pt-2">
              <div className="relative flex h-24 w-full items-end justify-center bg-[#d4c4a0]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cropArt(s.spriteKey, 0)}
                  alt=""
                  className="mb-1 h-[64px] w-[64px] object-contain grayscale [image-rendering:pixelated]"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-[10px] font-bold text-white">
                  Locked
                </span>
              </div>
              <p className={`mt-2 text-center text-[10px] ${ink}`}>{s.label}</p>
              <p className="mt-1 text-[9px] font-semibold text-[#8a5a10]">
                Unlocks Farm Lvl {s.unlockLevel}
              </p>
            </div>
          </div>
        ))}
      </div>
    </HudBottomSheet>
  );
}
