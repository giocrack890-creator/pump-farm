"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LeaderboardTable,
  type LeaderboardRow,
} from "@/components/leaderboard/LeaderboardTable";
import { useWalletStore } from "@/store/useWalletStore";

export default function LeaderboardPage() {
  const [scope, setScope] = useState<"season" | "alltime">("season");
  const highlight = useWalletStore((s) => s.address);

  const q = useQuery({
    queryKey: ["leaderboard", scope],
    queryFn: async () =>
      (await fetch(`/api/leaderboard?scope=${scope}`)).json(),
    refetchInterval: 20_000,
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
    <div className="mx-auto w-full max-w-6xl px-4 pb-24">
      <div className="mb-8 space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold md:text-4xl">
          Leaderboard
        </h1>
        <p className="max-w-2xl text-white/55">
          Ranked by Season Points. Projected payouts assume the current Silo
          balance and published curve — final amounts settle on-chain at season
          end.
        </p>
      </div>

      <Tabs
        value={scope === "season" ? "season" : "alltime"}
        onValueChange={(v) => setScope(v === "alltime" ? "alltime" : "season")}
      >
        <TabsList>
          <TabsTrigger value="season">This Season</TabsTrigger>
          <TabsTrigger value="alltime">All-Time</TabsTrigger>
        </TabsList>
        <TabsContent value="season">
          <LeaderboardTable rows={rows} highlightWallet={highlight} />
        </TabsContent>
        <TabsContent value="alltime">
          <LeaderboardTable rows={rows} highlightWallet={highlight} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
