"use client";

import { useState } from "react";
import { useReducedMotion } from "framer-motion";
import { formatNumber } from "@/lib/utils";
import { useXpBar } from "@/store/usePlayerStore";
import { nextUnlockLabel } from "@/lib/game/xp";
import { hudInk, hudPanel } from "@/components/hud/hudChrome";
import { HUD } from "@/components/hud/hudAssets";
import { AnimatedNumber } from "@/components/hud/AnimatedNumber";

const wood = `pointer-events-auto ${hudPanel}`;
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
  incomeBreakdown,
}: {
  sp: number;
  hype: number;
  seasonLabel: string;
  weather?: string;
  activity?: number;
  hypePerSec?: number;
  incomeBreakdown?: { label: string; rate: number }[];
}) {
  const { level, current, next, ratio } = useXpBar();
  const nextUnlock = nextUnlockLabel(level);
  const [rateOpen, setRateOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-2 md:p-3">
      <div className={`${wood} flex max-w-[240px] items-center gap-2 p-2`}>
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HUD.navFrame}
            alt=""
            className="absolute inset-0 h-full w-full object-fill [image-rendering:pixelated]"
            draggable={false}
          />
          <ArtIcon
            src="/assets/sprites/companions/farmer.png"
            alt=""
            className={`relative z-10 h-9 w-9 ${reduce ? "" : "animate-[pf-bob_2.4s_ease-in-out_infinite]"}`}
          />
          <span
            className={`absolute -bottom-1 left-1/2 z-10 -translate-x-1/2 border-2 border-[#5c3a1e] bg-[#efe0bc] px-1 text-[8px] ${ink}`}
          >
            {level}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1">
            <ArtIcon src={HUD.xp} alt="XP" className="h-5 w-5" />
            <p className={`truncate text-[9px] ${ink}`}>Farmer</p>
          </div>
          <div className="relative h-4 w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HUD.progressFrame}
              alt=""
              className="absolute inset-0 h-full w-full object-fill [image-rendering:pixelated]"
              draggable={false}
            />
            <div
              className="absolute bottom-[22%] left-[4%] top-[22%] overflow-hidden transition-[width] duration-500 ease-out"
              style={{ width: `${Math.max(4, ratio * 92)}%` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={HUD.progressFill}
                alt=""
                className="h-full w-full object-cover object-left [image-rendering:pixelated]"
                draggable={false}
              />
            </div>
          </div>
          <p className={`mt-0.5 truncate text-[7px] text-[#5c3a1e]`} title={nextUnlock}>
            {formatNumber(current, 0)}/{formatNumber(next, 0)} · {nextUnlock}
          </p>
        </div>
      </div>

      <div className="pointer-events-auto relative flex flex-col items-end gap-1.5">
        <div
          id="hud-sp-pill"
          className={`${wood} flex min-w-[132px] items-center gap-2 px-2.5 py-1.5 transition-transform duration-200`}
        >
          <ArtIcon src={HUD.coin} alt="SP" className="h-8 w-8" />
          <div className="leading-none">
            <p className={`text-[13px] tabular-nums ${inkRed}`}>
              <AnimatedNumber value={sp} decimals={1} />
            </p>
            <p className="text-[8px] text-[#5c3a1e]">SP</p>
          </div>
        </div>
        <div
          id="hud-hype-pill"
          className={`${wood} flex min-w-[132px] items-center gap-2 px-2.5 py-1.5`}
        >
          <ArtIcon src={HUD.hype} alt="Hype" className="h-8 w-8" />
          <div className="leading-none">
            <p className={`text-[13px] tabular-nums ${inkRed}`}>
              <AnimatedNumber value={hype} decimals={0} />
            </p>
            <p className="text-[8px] text-[#5c3a1e]">Hype</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setRateOpen((v) => !v)}
          className={`${wood} flex min-w-[132px] cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left hover:brightness-105`}
          aria-expanded={rateOpen}
          aria-label="Income rate breakdown"
        >
          <span className="text-[10px] font-bold text-[#1a5c30]">⚡</span>
          <div className="leading-none">
            <p className={`text-[12px] tabular-nums ${ink}`}>
              +{hypePerSec.toFixed(2)}
              <span className="text-[8px]">/s</span>
            </p>
            <p className="text-[7px] text-[#5c3a1e]">Idle Hype · tap</p>
          </div>
        </button>

        {rateOpen && (
          <div className={`${wood} absolute right-0 top-[calc(100%+4px)] z-30 w-[200px] p-2`}>
            <p className={`mb-1 text-[9px] ${ink}`}>Income breakdown</p>
            <ul className="space-y-1 text-[8px] text-[#5c3a1e]">
              {(incomeBreakdown?.length
                ? incomeBreakdown
                : [{ label: "Deployed workers", rate: hypePerSec }]
              ).map((row) => (
                <li key={row.label} className="flex justify-between gap-2">
                  <span>{row.label}</span>
                  <span className="tabular-nums font-bold text-[#1a5c30]">
                    +{row.rate.toFixed(2)}/s
                  </span>
                </li>
              ))}
              <li className="flex justify-between gap-2 border-t border-[#5c3a1e]/30 pt-1 font-bold">
                <span>Activity</span>
                <span>×{activity.toFixed(1)}</span>
              </li>
            </ul>
            <p className="mt-2 text-[7px] leading-snug text-[#5c3a1e]/80">
              Live visual rate matches server idle credit (same formula as offline).
            </p>
            <p className="mt-1 truncate text-[7px] text-[#5c3a1e]">{seasonLabel}</p>
          </div>
        )}
      </div>
    </div>
  );
}
