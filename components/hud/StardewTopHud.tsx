"use client";

import { useEffect, useState } from "react";
import { formatNumber } from "@/lib/utils";
import { useXpBar } from "@/store/usePlayerStore";
import { nextUnlockLabel } from "@/lib/game/xp";

/** Stardew Valley–style beveled wood HUD chrome. */
const wood =
  "pointer-events-auto border-[4px] border-[#6b3e1f] bg-[#e8c48a] shadow-[inset_2px_2px_0_#f5deb0,inset_-2px_-2px_0_#a86f3a,4px_4px_0_#3a2414] [image-rendering:pixelated]";
const parchment =
  "border-[3px] border-[#8b5a2b] bg-[#f6e6c4] shadow-[inset_1px_1px_0_#fff8e0]";
const ink = "font-[family-name:var(--font-pixel)] text-[#4a1e0c]";
const inkRed = "font-[family-name:var(--font-pixel)] text-[#8b1e1e]";

function ArtIcon({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`${className ?? "h-6 w-6"} object-contain [image-rendering:pixelated]`}
      draggable={false}
    />
  );
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Day-phase dial (Stardew clock) — 0=midnight, 0.5=noon. */
function DayDial({ date }: { date: Date }) {
  const mins = date.getHours() * 60 + date.getMinutes();
  const t = mins / (24 * 60); // 0..1
  const angle = t * 360 - 90;
  return (
    <div
      className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border-[3px] border-[#6b3e1f]"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#1a2744_0%,#1a2744_48%,#87ceeb_52%,#87ceeb_100%)]" />
      <span className="absolute left-1/2 top-2 -translate-x-1/2 text-[10px]">🌙</span>
      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[12px]">☀️</span>
      <div
        className="absolute left-1/2 top-1/2 h-1 w-7 origin-left bg-[#d4a017]"
        style={{ transform: `rotate(${angle}deg)` }}
      />
      <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#6b3e1f] bg-[#ffe08a]" />
    </div>
  );
}

export function StardewTopHud({
  sp,
  hype,
  seasonLabel,
  weather = "Sunny",
  activity = 1,
  hypePerSec = 0,
}: {
  sp: number;
  hype: number;
  seasonLabel: string;
  weather?: string;
  activity?: number;
  hypePerSec?: number;
}) {
  const now = useClock();
  const { level, current, next, ratio } = useXpBar();
  const nextUnlock = nextUnlockLabel(level);
  const day = now.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
  const time = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-2 md:p-3">
      {/* Left: farmer + XP (Stardew inventory-adjacent plaque) */}
      <div className={`${wood} flex max-w-[220px] items-center gap-2 p-2`}>
        <div className={`relative flex h-14 w-14 items-center justify-center ${parchment}`}>
          <ArtIcon src="/assets/sprites/companions/pet.png" alt="" className="h-11 w-11" />
          <span
            className={`absolute -bottom-1 left-1/2 -translate-x-1/2 border-2 border-[#6b3e1f] bg-[#ffe08a] px-1 text-[8px] ${ink}`}
          >
            {level}
          </span>
        </div>
        <div className="min-w-0">
          <p className={`truncate text-[9px] ${ink}`}>Farmer</p>
          <div className="mt-1 h-2.5 overflow-hidden border-2 border-[#6b3e1f] bg-[#3a2414]">
            <div className="h-full bg-[#3dff7a]" style={{ width: `${ratio * 100}%` }} />
          </div>
          <p className={`mt-0.5 truncate text-[7px] text-[#6b3e1f]`} title={nextUnlock}>
            {formatNumber(current, 0)}/{formatNumber(next, 0)} · {nextUnlock}
          </p>
        </div>
      </div>

      {/* Right: Stardew clock + currencies */}
      <div className="pointer-events-auto flex flex-col items-end gap-1.5">
        <div className={`${wood} flex items-stretch gap-2 p-1.5`}>
          <DayDial date={now} />
          <div className="flex min-w-[108px] flex-col justify-between py-0.5">
            <div className={`${parchment} px-2 py-0.5 text-center`}>
              <p className={`text-[9px] ${inkRed}`}>{day}</p>
            </div>
            <div className="mt-1 flex gap-1">
              <div className={`${parchment} flex h-8 w-8 items-center justify-center text-sm`} title={weather}>
                {weather === "Sunny" ? "☀️" : weather === "Rain" ? "🌧" : "⛅"}
              </div>
              <div className={`${parchment} flex h-8 flex-1 items-center justify-center px-1`}>
                <span className={`text-[8px] ${ink}`} title="Activity (farmer floor)">
                  ×{activity.toFixed(1)}
                </span>
              </div>
            </div>
            <div className={`${parchment} mt-1 px-2 py-0.5 text-center`}>
              <p className={`text-[9px] ${inkRed}`}>{time}</p>
            </div>
          </div>
        </div>

        <div className={`${wood} flex items-center gap-2 px-2 py-1.5`}>
          <ArtIcon src="/assets/sprites/ui/farm_coin.png" alt="SP" />
          <span className={`text-[11px] tabular-nums ${inkRed}`}>{formatNumber(sp, 1)}</span>
          <span className="text-[8px] text-[#6b3e1f]">SP</span>
        </div>
        <div className={`${wood} flex items-center gap-2 px-2 py-1.5`}>
          <ArtIcon src="/assets/icons/hype.png" alt="Hype" />
          <span className={`text-[11px] tabular-nums ${inkRed}`}>{formatNumber(hype, 0)}</span>
          <span className="text-[8px] text-[#6b3e1f]">Hype</span>
          {hypePerSec > 0 && (
            <span className="text-[7px] text-[#1a5c30]">+{hypePerSec.toFixed(2)}/s</span>
          )}
        </div>
        <div className={`${wood} max-w-[200px] px-2 py-1`}>
          <p className={`text-[7px] leading-snug text-[#6b3e1f]`}>{seasonLabel}</p>
        </div>
      </div>
    </div>
  );
}
