"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LeaderboardTable,
  type LeaderboardRow,
} from "@/components/leaderboard/LeaderboardTable";
import { useWalletStore } from "@/store/useWalletStore";
import { DISCLAIMER } from "@/components/layout/Footer";

function mapEntries(data: unknown): LeaderboardRow[] {
  const payload = data as {
    entries?: Array<{
      rank?: number;
      address?: string;
      walletId?: string;
      wallet?: string;
      displayName?: string | null;
      points?: string | number;
      sp?: number;
      farmSize?: number;
      projectedPayout?: string | number;
      projected?: number;
    }>;
  };
  const entries = payload?.entries ?? [];
  return entries.map((r, i) => ({
    rank: r.rank ?? i + 1,
    wallet: r.wallet ?? r.address ?? r.walletId ?? `unknown-${i}`,
    displayName: r.displayName ?? null,
    farmSize: r.farmSize ?? 0,
    sp: Number(r.sp ?? r.points ?? 0),
    projected: Number(r.projected ?? r.projectedPayout ?? 0),
  }));
}

export default function LeaderboardPage() {
  const [scope, setScope] = useState<"season" | "alltime">("season");
  const highlight = useWalletStore((s) => s.address);

  const q = useQuery({
    queryKey: ["leaderboard", scope],
    queryFn: async () =>
      (await fetch(`/api/leaderboard?scope=${scope}`)).json(),
    refetchInterval: 20_000,
  });

  const rows = useMemo(() => mapEntries(q.data), [q.data]);
  const isDemo = Boolean((q.data as { demo?: boolean } | undefined)?.demo);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24">
      <div className="mb-8 space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold md:text-4xl">
          Leaderboard
        </h1>
        <p className="max-w-2xl text-white/55">
          Ranked by Season Points. Names are farmer handles — projected payouts
          assume the current Silo balance and settle on-chain at season end.
        </p>
        {isDemo ? (
          <p className="text-sm text-amber-200/80">
            Demo mode: only this device is ranked until production DB is connected.
          </p>
        ) : null}
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
          {q.isLoading ? (
            <p className="text-sm text-white/50">Loading ranks…</p>
          ) : (
            <LeaderboardTable rows={rows} highlightWallet={highlight} />
          )}
        </TabsContent>
        <TabsContent value="alltime">
          {q.isLoading ? (
            <p className="text-sm text-white/50">Loading ranks…</p>
          ) : (
            <LeaderboardTable rows={rows} highlightWallet={highlight} />
          )}
        </TabsContent>
      </Tabs>
      <p className="mt-10 max-w-3xl text-[11px] leading-relaxed text-white/40">{DISCLAIMER}</p>
    </div>
  );
}
