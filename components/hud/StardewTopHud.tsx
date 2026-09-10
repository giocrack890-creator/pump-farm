"use client";

import { formatNumber } from "@/lib/utils";
import { useXpBar } from "@/store/usePlayerStore";
import { nextUnlockLabel } from "@/lib/game/xp";
import { hudInk, hudPanel, hudPanelInset } from "@/components/hud/hudChrome";

/** HUD chrome — VectoRaith pack earth palette. */
const wood = `pointer-events-auto ${hudPanel}`;
const parchment = hudPanelInset;
const ink = hudInk;
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

export function StardewTopHud({
  sp,
  hype,
  seasonLabel,
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
  const { level, current, next, ratio } = useXpBar();
  const nextUnlock = nextUnlockLabel(level);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-2 md:p-3">
      {/* Left: farmer + XP */}
      <div className={`${wood} flex max-w-[220px] items-center gap-2 p-2`}>
        <div className={`relative flex h-14 w-14 items-center justify-center ${parchment}`}>
          <ArtIcon src="/assets/sprites/companions/farmer.png" alt="" className="h-11 w-11" />
          <span
            className={`absolute -bottom-1 left-1/2 -translate-x-1/2 border-2 border-[#5c3a1e] bg-[#efe0bc] px-1 text-[8px] ${ink}`}
          >
            {level}
          </span>
        </div>
        <div className="min-w-0">
          <p className={`truncate text-[9px] ${ink}`}>Farmer</p>
          <div className="mt-1 h-2.5 overflow-hidden border-2 border-[#5c3a1e] bg-[#3a2414]">
            <div className="h-full bg-[#7bb85c]" style={{ width: `${ratio * 100}%` }} />
          </div>
          <p className={`mt-0.5 truncate text-[7px] text-[#5c3a1e]`} title={nextUnlock}>
            {formatNumber(current, 0)}/{formatNumber(next, 0)} · {nextUnlock}
          </p>
        </div>
      </div>

      {/* Right: money first — no day/clock widget */}
      <div className="pointer-events-auto flex flex-col items-end gap-1.5">
        <div className={`${wood} flex items-center gap-2 px-3 py-2`}>
          <ArtIcon src="/assets/sprites/ui/farm_coin.png" alt="SP" className="h-7 w-7" />
          <span className={`text-[13px] tabular-nums ${inkRed}`}>{formatNumber(sp, 1)}</span>
          <span className="text-[9px] text-[#5c3a1e]">SP</span>
        </div>
        <div className={`${wood} flex items-center gap-2 px-3 py-2`}>
          <ArtIcon src="/assets/icons/hype.png" alt="Hype" className="h-7 w-7" />
          <span className={`text-[13px] tabular-nums ${inkRed}`}>{formatNumber(hype, 0)}</span>
          <span className="text-[9px] text-[#5c3a1e]">Hype</span>
          {hypePerSec > 0 && (
            <span className="text-[7px] text-[#3d7a2e]">+{hypePerSec.toFixed(2)}/s</span>
          )}
        </div>
        <div className={`${wood} flex items-center gap-2 px-2 py-1`}>
          <span className={`text-[8px] ${ink}`} title="Activity multiplier">
            ×{activity.toFixed(1)}
          </span>
          <span className="text-[7px] text-[#5c3a1e]">·</span>
          <p className="max-w-[140px] truncate text-[7px] leading-snug text-[#5c3a1e]">
            {seasonLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
