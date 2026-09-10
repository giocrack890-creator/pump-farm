"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatNumber } from "@/lib/utils";

/**
 * Progressive silo frames (empty → overflow) from art kit.
 * Thresholds map pot fill % to the nearest frame; crossfade on change.
 */
const SILO_FRAMES = [
  { maxPct: 8, src: "/assets/sprites/rewards/silo-progress/silo-00-empty.jpg" },
  { maxPct: 28, src: "/assets/sprites/rewards/silo-progress/silo-01-low.jpg" },
  { maxPct: 48, src: "/assets/sprites/rewards/silo-progress/silo-02-mid.jpg" },
  { maxPct: 72, src: "/assets/sprites/rewards/silo-progress/silo-03-high.jpg" },
  { maxPct: 96, src: "/assets/sprites/rewards/silo-progress/silo-04-full.jpg" },
  { maxPct: 999, src: "/assets/sprites/rewards/silo-progress/silo-05-overflow.jpg" },
] as const;

function frameIndexForPct(pct: number): number {
  const p = Math.max(0, pct);
  if (p > 100) return SILO_FRAMES.length - 1; // overflow
  if (p >= 97) return SILO_FRAMES.length - 2; // full
  for (let i = 0; i < SILO_FRAMES.length - 1; i++) {
    if (p <= SILO_FRAMES[i]!.maxPct) return i;
  }
  return SILO_FRAMES.length - 2;
}

type Props = {
  poolEth: number;
  fillPct: number;
  potUsd: number;
};

export function SiloCoinFill({ poolEth, fillPct, potUsd }: Props) {
  const clamped = Math.max(0, fillPct);
  const targetIdx = frameIndexForPct(clamped);
  const [displayPct, setDisplayPct] = useState(clamped);
  const [activeIdx, setActiveIdx] = useState(targetIdx);
  const [prevIdx, setPrevIdx] = useState(targetIdx);
  const [fading, setFading] = useState(false);
  const [deltaLabel, setDeltaLabel] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const prevPool = useRef(poolEth);

  const frames = useMemo(() => SILO_FRAMES.map((f) => f.src), []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Preload frames
  useEffect(() => {
    for (const src of frames) {
      const img = new Image();
      img.src = src;
    }
  }, [frames]);

  useEffect(() => {
    const prev = prevPool.current;
    const grew = poolEth > prev + 0.00005;
    prevPool.current = poolEth;

    if (grew) {
      const d = poolEth - prev;
      setDeltaLabel(`+${formatNumber(d, 4)} ETH`);
      const clearDelta = window.setTimeout(() => setDeltaLabel(null), 1600);
      const start = performance.now();
      const from = displayPct;
      const to = clamped;
      const dur = reduceMotion ? 160 : 700;
      let raf = 0;
      const tick = (now: number) => {
        const tNorm = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - tNorm, 3);
        setDisplayPct(from + (to - from) * eased);
        if (tNorm < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(clearDelta);
      };
    }

    setDisplayPct(clamped);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolEth, clamped, reduceMotion]);

  useEffect(() => {
    const next = frameIndexForPct(displayPct);
    if (next === activeIdx) return;
    if (reduceMotion) {
      setActiveIdx(next);
      setPrevIdx(next);
      setFading(false);
      return;
    }
    setPrevIdx(activeIdx);
    setActiveIdx(next);
    setFading(true);
    const t = window.setTimeout(() => setFading(false), 480);
    return () => window.clearTimeout(t);
  }, [displayPct, activeIdx, reduceMotion]);

  return (
    <div className="relative mx-auto w-full max-w-[240px]">
      <div className="relative mx-auto aspect-[3/4] w-full overflow-hidden rounded-sm border-[2px] border-[#6e4a28] bg-[#efe0bc] shadow-[inset_1px_1px_0_#fff6d8]">
        {/* Underlay (previous frame) during crossfade */}
        {fading && prevIdx !== activeIdx ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={frames[prevIdx]}
            alt=""
            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-contain"
            draggable={false}
          />
        ) : null}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={frames[activeIdx]}
          src={frames[activeIdx]}
          alt=""
          className={`pointer-events-none absolute inset-0 z-[1] h-full w-full object-contain ${
            fading && !reduceMotion ? "pf-silo-frame-in" : ""
          }`}
          draggable={false}
        />

        {deltaLabel ? (
          <p className="pf-silo-delta pointer-events-none absolute left-1/2 top-[18%] z-10 -translate-x-1/2 font-[family-name:var(--font-pixel)] text-[10px] font-bold text-[#ffe08a] drop-shadow-[0_2px_0_#3a2414]">
            {deltaLabel}
          </p>
        ) : null}
      </div>

      <div className="mt-1 text-center">
        <p className="text-[9px] uppercase tracking-wider text-[#5c3a1e]/85">Pot total</p>
        <p className="font-[family-name:var(--font-pixel)] text-2xl font-bold tabular-nums text-[#1a5c30]">
          ${formatNumber(potUsd, 0)}
        </p>
        <p className="mt-0.5 text-[10px] tabular-nums text-[#5c3a1e]">
          {formatNumber(poolEth, 4)} ETH · {Math.min(100, displayPct).toFixed(0)}% full
        </p>
      </div>
    </div>
  );
}
