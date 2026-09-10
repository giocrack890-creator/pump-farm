"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HudBottomSheet } from "@/components/hud/HudBottomSheet";
import {
  LeaderboardTable,
  type LeaderboardRow,
} from "@/components/leaderboard/LeaderboardTable";
import { useWalletStore } from "@/store/useWalletStore";
import { DISCLAIMER } from "@/components/layout/Footer";
import { hudBtnSecondary, hudInkMuted } from "@/components/hud/hudChrome";

type Props = {
  open: boolean;
  onClose: () => void;
};

/** Ranks / leaderboard as in-play popup. */
export function RanksSheet({ open, onClose }: Props) {
  const [scope, setScope] = useState<"season" | "alltime">("season");
  const highlight = useWalletStore((s) => s.address);

  const q = useQuery({
    queryKey: ["leaderboard", scope],
    queryFn: async () => (await fetch(`/api/leaderboard?scope=${scope}`)).json(),
    refetchInterval: open ? 20_000 : false,
    enabled: open,
  });

  const rows: LeaderboardRow[] = useMemo(() => {
    const entries = (q.data?.entries ?? q.data?.rows ?? []) as Array<{
      rank?: number;
      address?: string;
      walletId?: string;
      wallet?: string;
      points?: string | number;
      sp?: number;
      farmSize?: number;
      projectedPayout?: string | number;
      projected?: number;
    }>;

    if (!entries.length) {
      return [
        {
          rank: 1,
          wallet: "7GkFarmLeaderboardDemo1111111111111111111",
          farmSize: 18,
          sp: 12840,
          projected: 8.4,
        },
        {
          rank: 2,
          wallet: "B2nxPumpLeaderboardDemo22222222222222222",
          farmSize: 15,
          sp: 10220,
          projected: 5.1,
        },
        {
          rank: 3,
          wallet: "9qLmSiloLeaderboardDemo33333333333333333",
          farmSize: 12,
          sp: 8810,
          projected: 3.2,
        },
      ];
    }

    return entries.map((r, i) => ({
      rank: r.rank ?? i + 1,
      wallet: r.wallet ?? r.address ?? r.walletId ?? `unknown-${i}`,
      farmSize: r.farmSize ?? 9,
      sp: Number(r.sp ?? r.points ?? 0),
      projected: Number(r.projected ?? r.projectedPayout ?? 0),
    }));
  }, [q.data]);

  return (
    <HudBottomSheet
      open={open}
      onClose={onClose}
      title="Ranking"
      subtitle="Quién va primero en SP esta Season. Eso define cuánto del pozo te toca."
      ariaLabel="Ranking de la Season"
      maxHeightClass="max-h-[85vh]"
    >
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          className={`${hudBtnSecondary} !py-2 text-[10px] ${scope === "season" ? "brightness-110 ring-2 ring-[#3d7a2e]" : ""}`}
          onClick={() => setScope("season")}
        >
          This Season
        </button>
        <button
          type="button"
          className={`${hudBtnSecondary} !py-2 text-[10px] ${scope === "alltime" ? "brightness-110 ring-2 ring-[#3d7a2e]" : ""}`}
          onClick={() => setScope("alltime")}
        >
          All-Time
        </button>
      </div>
      {q.isLoading ? (
        <p className={`text-sm ${hudInkMuted}`}>Loading ranks…</p>
      ) : (
        <LeaderboardTable rows={rows} highlightWallet={highlight} />
      )}
      <p className={`mt-4 text-[10px] leading-relaxed ${hudInkMuted}`}>{DISCLAIMER}</p>
    </HudBottomSheet>
  );
}
