"use client";

import { useQuery } from "@tanstack/react-query";
import { HUD } from "@/components/hud/hudAssets";
import { formatNumber } from "@/lib/utils";
import { ETH_USD_DISPLAY } from "@/lib/game/config";

type Props = {
  onOpen: () => void;
};

/** Compact season pot chip — English. */
export function PoolHudChip({ onOpen }: Props) {
  const seasonQ = useQuery({
    queryKey: ["season"],
    queryFn: async () => (await fetch("/api/season")).json(),
    refetchInterval: 30_000,
  });

  const pool = Number(seasonQ.data?.pool?.displayBalance ?? 42.5);
  const usd = pool * ETH_USD_DISPLAY;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="pointer-events-auto absolute left-3 top-[17.5rem] z-20 w-[148px] cursor-pointer border-[3px] border-[#3d7a2e] bg-[#1a2e12] p-2 text-left shadow-[3px_3px_0_#0a1408] hover:brightness-110 md:left-4"
      aria-label="Open season rewards pot"
    >
      <div className="flex items-center gap-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HUD.silo} alt="" className="h-5 w-5 [image-rendering:pixelated]" />
        <p className="font-[family-name:var(--font-pixel)] text-[8px] uppercase tracking-wide text-[#9dffb8]">
          Season Pot
        </p>
      </div>
      <p className="mt-1 font-[family-name:var(--font-pixel)] text-[16px] tabular-nums leading-none text-[#7bb85c]">
        ${formatNumber(usd, 0)}
      </p>
      <p className="mt-1 text-[8px] text-[#9dffb8]/80">
        Live · {formatNumber(pool, 2)} ETH · tap
      </p>
    </button>
  );
}
