"use client";

import { RankBadge } from "@/components/leaderboard/RankBadge";
import { truncateAddress, formatNumber, cn } from "@/lib/utils";

export type LeaderboardRow = {
  rank: number;
  wallet: string;
  farmSize: number;
  sp: number;
  projected: number;
  isYou?: boolean;
};

type Props = {
  rows: LeaderboardRow[];
  highlightWallet?: string | null;
};

export function LeaderboardTable({ rows, highlightWallet }: Props) {
  return (
    <div className="glass-panel overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-black/30 text-[11px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">Wallet</th>
              <th className="px-4 py-3 font-medium">Farm size</th>
              <th className="px-4 py-3 font-medium">SP</th>
              <th className="px-4 py-3 font-medium">Projected</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const you =
                row.isYou ||
                (highlightWallet &&
                  row.wallet.toLowerCase() === highlightWallet.toLowerCase());
              return (
                <tr
                  key={`${row.rank}-${row.wallet}`}
                  className={cn(
                    "border-b border-white/5 transition hover:bg-white/[0.03]",
                    you && "bg-primary/10",
                  )}
                >
                  <td className="px-4 py-3">
                    <RankBadge rank={row.rank} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-[#041008]"
                        style={{
                          background: `linear-gradient(135deg, #3DFF7A, hsl(${(row.wallet.charCodeAt(0) * 17) % 360} 70% 45%))`,
                        }}
                        aria-hidden
                      >
                        {row.wallet.slice(0, 2)}
                      </span>
                      <span className="tabular-nums">
                        {truncateAddress(row.wallet, 4)}
                        {you ? (
                          <span className="ml-2 text-xs text-primary">you</span>
                        ) : null}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{row.farmSize}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-primary">
                    {formatNumber(row.sp)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-gold">
                    {formatNumber(row.projected, 3)} ETH
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
