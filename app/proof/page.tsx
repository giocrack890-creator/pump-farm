"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CopyAddress } from "@/components/shared/CopyAddress";
import { TreasuryLog } from "@/components/proof/TreasuryLog";
import type { TreasuryTx } from "@/components/proof/TxRow";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TREASURY_WALLET, TOKEN_TICKER, OPS_RESERVE_PCT } from "@/lib/game/config";
import { DISCLAIMER } from "@/components/layout/Footer";

const FALLBACK_SERIES = [
  { day: "Mon", pool: 12.4 },
  { day: "Tue", pool: 18.1 },
  { day: "Wed", pool: 22.0 },
  { day: "Thu", pool: 29.6 },
  { day: "Fri", pool: 34.2 },
  { day: "Sat", pool: 39.8 },
  { day: "Sun", pool: 42.5 },
];

export default function ProofPage() {
  const q = useQuery({
    queryKey: ["treasury"],
    queryFn: async () => (await fetch("/api/treasury")).json(),
    refetchInterval: 30_000,
  });

  const address =
    q.data?.address || TREASURY_WALLET || "Treasury1111111111111111111111111111111111";

  const txs: TreasuryTx[] = useMemo(() => {
    const raw = (q.data?.transactions ?? []) as Array<{
      id: string;
      type: string;
      amount: string | number;
      txHash: string;
      note?: string;
      createdAt: string;
    }>;
    return raw.map((t) => ({
      id: t.id,
      type: t.type === "payout" ? "payout" : "deposit",
      amount: Number(t.amount),
      txHash: t.txHash,
      note: t.note,
      createdAt: t.createdAt,
    }));
  }, [q.data]);

  const series =
    (q.data?.history as Array<{ day: string; pool: number }> | undefined) ??
    FALLBACK_SERIES;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24">
      <div className="mb-8 max-w-3xl space-y-3">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold md:text-4xl">
          Proof / Treasury
        </h1>
        <p className="text-base leading-relaxed text-white/55">
          Calm facts only. The Silo wallet accrues ${TOKEN_TICKER} trading fees;
          payouts are executed on-chain and logged here. Ops reserve:{" "}
          {(OPS_RESERVE_PCT * 100).toFixed(0)}%. Verify independently on a block
          explorer.
        </p>
        <CopyAddress address={address} label="Treasury" />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pool balance (7d)</CardTitle>
            <CardDescription>
              Live series when treasury history is available; otherwise illustrative.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="poolFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3DFF7A" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#3DFF7A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#8aa396", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#8aa396", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#101a16",
                    border: "1px solid rgba(61,255,122,0.2)",
                    borderRadius: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pool"
                  stroke="#3DFF7A"
                  fill="url(#poolFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How to verify</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-white/55">
            <p>1. Copy the treasury address above.</p>
            <p>2. Open it on Blockscout (Robinhood Chain).</p>
            <p>3. Match deposit and payout hashes in the log below.</p>
            <p>
              Season Point math is computed server-side; only payout transfers
              move real funds.
            </p>
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold">
        Transaction log
      </h2>
      <TreasuryLog txs={txs} />
      <p className="mt-10 max-w-3xl text-[11px] leading-relaxed text-white/40">{DISCLAIMER}</p>
    </div>
  );
}
