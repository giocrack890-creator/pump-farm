"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  PAYOUT_TIER_1_SHARE,
  PAYOUT_TIER_2_SHARE,
  PAYOUT_TIER_3_SHARE,
} from "@/lib/game/config";
import { useAppConfig } from "@/hooks/useAppConfig";
import { formatNumber } from "@/lib/utils";
import { toast } from "@/store/useToastStore";
import { PixelIcon, type PixelIconId } from "@/components/landing/PixelIcon";

type SeasonCurrent = {
  season: { number: number; endsAt: string | null };
  siloBalance: number | null;
  siloTarget: number;
  percentFull: number | null;
  stale?: boolean;
  payoutSplit: { id: string; label: string; share: number }[];
  live: boolean;
};

type PublicStats = {
  activeFarmers?: number;
  marketCap?: number | null;
  priceUsd?: number | null;
  volume24h?: number | null;
  priceChange24h?: number | null;
  feedSymbol?: string | null;
  feedProxy?: boolean;
  pairUrl?: string | null;
  mock?: boolean;
};

type PriceApi = {
  priceUsd: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number | null;
  symbol: string | null;
  pairUrl?: string;
  proxy: boolean;
  /** 'chain' when read from the curve or pool, 'api' from an indexer. */
  source: "chain" | "api" | "none";
  fetchedAt: string;
};

const SPARK_KEY = "pf_live_mcap_spark_v1";
const SPARK_MAX = 36;

function readSpark(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(SPARK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as number[];
    return Array.isArray(parsed) ? parsed.filter((n) => Number.isFinite(n)) : [];
  } catch {
    return [];
  }
}

function writeSpark(pts: number[]) {
  try {
    sessionStorage.setItem(SPARK_KEY, JSON.stringify(pts.slice(-SPARK_MAX)));
  } catch {
    /* ignore */
  }
}

/** Full USD market cap for the hero — e.g. $55,083,380 (literal). */
function formatMarketCapHero(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatPrice(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1) return `$${n.toFixed(4)}`;
  if (n >= 0.01) return `$${n.toFixed(5)}`;
  return `$${n.toFixed(6)}`;
}

function LiveChart({ series }: { series: number[] }) {
  const w = 280;
  const h = 96;
  if (series.length < 2) {
    return (
      <div className="flex h-24 items-center justify-center text-[11px] text-[var(--ink-muted)]">
        Collecting live ticks…
      </div>
    );
  }
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = Math.max(1e-12, max - min);
  const d = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 8) - 4;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = series[series.length - 1]! >= series[0]!;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full" role="img" aria-label="Live market cap chart">
      <path
        d={d}
        fill="none"
        stroke={up ? "#5c8a3a" : "#b54a3a"}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const RANK_ICONS: PixelIconId[] = ["rank_gold", "rank_silver", "rank_bronze"];

export function LandingSidebar() {
  const { tokenAddress, tokenLive: mintLive, ticker } = useAppConfig();
  const contractAddress = tokenAddress ?? "";
  const [spark, setSpark] = useState<number[]>([]);
  const primed = useRef(false);

  useEffect(() => {
    setSpark(readSpark());
    primed.current = true;
  }, []);

  const seasonQ = useQuery({
    queryKey: ["season-current"],
    queryFn: async () => {
      const res = await fetch("/api/season/current");
      if (!res.ok) throw new Error("season");
      return (await res.json()) as SeasonCurrent;
    },
    refetchInterval: 30_000,
  });

  const statsQ = useQuery({
    queryKey: ["stats-public"],
    queryFn: async () => {
      const res = await fetch("/api/stats/public");
      if (!res.ok) throw new Error("stats");
      return (await res.json()) as PublicStats;
    },
    refetchInterval: 15_000,
  });

  const priceQ = useQuery({
    queryKey: ["token-price"],
    queryFn: async () => {
      const res = await fetch("/api/price");
      if (!res.ok) throw new Error("price");
      return (await res.json()) as PriceApi;
    },
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const cap = priceQ.data?.marketCap;
    if (
      !primed.current ||
      cap == null ||
      !Number.isFinite(cap) ||
      cap <= 0 ||
      priceQ.data?.source === "none"
    ) {
      return;
    }
    setSpark((prev) => {
      const last = prev[prev.length - 1];
      if (last != null && Math.abs(last - cap) / last < 0.00005) return prev;
      const next = [...prev, cap].slice(-SPARK_MAX);
      writeSpark(next);
      return next;
    });
  }, [priceQ.data?.marketCap, priceQ.data?.source, priceQ.dataUpdatedAt]);

  const silo = seasonQ.data;
  const split = silo?.payoutSplit ?? [
    { id: "top", label: "Top 1%", share: PAYOUT_TIER_1_SHARE },
    { id: "mid", label: "Next 9%", share: PAYOUT_TIER_2_SHARE },
    { id: "rest", label: "Active rest", share: PAYOUT_TIER_3_SHARE },
  ];

  const live =
    priceQ.data?.source !== undefined &&
    priceQ.data.source !== "none" &&
    ((priceQ.data.marketCap ?? 0) > 0 || (priceQ.data.priceUsd ?? 0) > 0);
  const price = live ? priceQ.data!.priceUsd : null;
  const change24 = live ? priceQ.data!.priceChange24h : null;
  const mcapUsd = live
    ? (priceQ.data!.marketCap ?? statsQ.data?.marketCap ?? null)
    : null;
  const feedSymbol = live
    ? (priceQ.data!.symbol ?? statsQ.data?.feedSymbol ?? "TOKEN")
    : null;
  const pairUrl = priceQ.data?.pairUrl ?? statsQ.data?.pairUrl ?? null;
  const farmersOnline = statsQ.data?.activeFarmers;

  const changePct = change24 != null ? change24 * 100 : null;
  const changeLabel =
    changePct == null
      ? null
      : `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`;

  const chartSeries = useMemo(() => {
    if (spark.length >= 2) return spark;
    if (mcapUsd != null) return [mcapUsd * 0.998, mcapUsd];
    return [];
  }, [spark, mcapUsd]);

  const copyMint = async () => {
    if (!mintLive || !contractAddress) return;
    try {
      await navigator.clipboard.writeText(contractAddress);
      toast.success("Contract address copied");
    } catch {
      toast.error("Couldn't copy address");
    }
  };

  return (
    <aside className="flex flex-col gap-3">
      {/* Market cap — read on chain from the configured launch */}
      <div className="pf-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              {live && feedSymbol
                ? `$${feedSymbol} market cap`
                : `$${ticker} market cap`}
            </p>
            <p className="pf-mono mt-1 text-2xl font-bold tabular-nums text-[var(--ink)]">
              {live && mcapUsd != null ? formatMarketCapHero(mcapUsd) : "—"}
            </p>
            {changeLabel ? (
              <p
                className={`mt-1 text-[12px] font-bold ${
                  (changePct ?? 0) >= 0 ? "text-[var(--green)]" : "text-[#b54a3a]"
                }`}
              >
                {changeLabel}{" "}
                <span className="font-semibold text-[var(--ink-muted)]">24h</span>
              </p>
            ) : null}
            {live && price != null ? (
              <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
                Price {formatPrice(price)}
              </p>
            ) : null}
          </div>
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-bold ${
              live
                ? "bg-[#dff0d0] text-[var(--green)]"
                : "bg-[#efe0bc] text-[var(--wood-mid)]"
            }`}
          >
            {live ? "Live" : "Sample"}
          </span>
        </div>
        <div className="mt-3 rounded-lg border border-[var(--rule)] bg-[#fffdf6] p-2">
          <LiveChart series={chartSeries} />
        </div>
        <p className="mt-2 text-[10px] leading-snug text-[var(--ink-muted)]">
          {live
            ? `Price × supply, read from the bonding curve on Robinhood Chain · refreshes ~15s.`
            : `No live market cap yet — the chart fills in once the launch is configured.`}
        </p>
        {pairUrl ? (
          <a
            href={pairUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-[11px] font-bold text-[var(--wood-mid)] underline-offset-2 hover:underline"
          >
            View chart →
          </a>
        ) : null}
      </div>

      {/* Silo — real */}
      <div className="pf-card p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="pf-display flex items-center gap-1.5 text-[11px] text-[var(--wood-dark)]">
            <PixelIcon id="rank_crown" size={16} />
            The Silo
          </p>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              silo?.live
                ? "bg-[#dff0d0] text-[var(--green)]"
                : "bg-[#efe0bc] text-[var(--wood-mid)]"
            }`}
          >
            {silo?.live ? (silo.stale ? "Last known" : "Live") : "—"}
          </span>
        </div>
        <p className="pf-mono mt-2 text-2xl font-bold text-[var(--green)]">
          {silo?.live && silo.siloBalance != null
            ? formatNumber(silo.siloBalance, 3)
            : "—"}{" "}
          <span className="text-sm font-semibold text-[var(--ink-muted)]">ETH</span>
        </p>
        <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
          Season {silo?.season.number ?? "—"} fee pot ·{" "}
          {silo?.live && silo.percentFull != null
            ? `${formatNumber(silo.percentFull, 1)}% of ${formatNumber(silo.siloTarget, 0)} ETH target`
            : silo
              ? "pot not readable yet"
              : "loading…"}
        </p>
        <div className="pf-progress mt-3" aria-hidden>
          <div
            className="pf-progress-fill"
            style={{
              width: `${Math.min(100, silo?.live ? (silo.percentFull ?? 0) : 0)}%`,
            }}
          />
        </div>
        <p className="mt-3 text-[11px] font-semibold text-[var(--ink)]">Payout split</p>
        <div className="pf-split-bar mt-2">
          {split.map((t, i) => (
            <div
              key={t.id}
              style={{
                width: `${t.share * 100}%`,
                background: i === 0 ? "#d69a2d" : i === 1 ? "#5c8a3a" : "#4a7fae",
              }}
              title={`${t.label}: ${Math.round(t.share * 100)}%`}
            />
          ))}
        </div>
        <ul className="mt-2 space-y-1.5 text-[10px] text-[var(--ink-muted)]">
          {split.map((t, i) => (
            <li key={t.id} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <PixelIcon id={RANK_ICONS[i] ?? "rank_bronze"} size={16} />
                <span>{t.label}</span>
              </span>
              <span className="pf-mono font-semibold text-[var(--ink)]">
                {Math.round(t.share * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Contract */}
      <div id="contract" className="pf-card scroll-mt-24 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Contract address
        </p>
        {mintLive ? (
          <>
            <p className="pf-mono mt-2 break-all text-[12px] leading-relaxed text-[var(--ink)]">
              {contractAddress}
            </p>
            <button
              type="button"
              onClick={() => void copyMint()}
              className="pf-btn pf-btn-secondary mt-3 w-full !rounded-lg text-sm"
              aria-label="Copy contract address"
            >
              Copy address
            </button>
          </>
        ) : (
          <div className="mt-2 rounded-lg border-2 border-dashed border-[var(--gold)] bg-[#fff6df] px-3 py-3">
            <p className="text-[12px] font-semibold text-[var(--wood-dark)]">
              No live contract yet
            </p>
            <p className="mt-1 text-[11px] leading-snug text-[var(--ink-muted)]">
              ERC-20 contract address publishes at token launch (Robinhood Chain). We will never
              show a placeholder address here. Listing inside the Robinhood brokerage app is a
              separate process and is not implied by this CA.
            </p>
          </div>
        )}
        <a
          href={
            mintLive && contractAddress
              ? (pairUrl ??
                `https://www.ponsfamily.com/launchpad/${contractAddress}`)
              : (pairUrl ?? "#tokenomics")
          }
          className={`pf-btn pf-btn-primary mt-3 w-full !rounded-lg ${
            mintLive || pairUrl ? "" : "pointer-events-none opacity-50"
          }`}
          target={pairUrl ? "_blank" : undefined}
          rel={pairUrl ? "noreferrer" : undefined}
          aria-disabled={!mintLive && !pairUrl}
        >
          {mintLive ? `Buy $${ticker}` : live ? `View $${feedSymbol} chart` : `Buy $${ticker}`}
        </a>
      </div>

      {/* Live stats — HUD pills */}
      <div className="grid grid-cols-3 gap-2">
        <StatPill
          label="Holders"
          value="—"
          hint="At launch"
          icon="animal_farmer"
        />
        <StatPill
          label="Price"
          value={live && price != null ? formatPrice(price) : "—"}
          hint={live ? "Live" : "At launch"}
          icon="coin_farm"
          live={live && price != null}
        />
        <StatPill
          label="Farmers"
          value={farmersOnline != null ? formatNumber(farmersOnline, 0) : "—"}
          hint="Online / total"
          icon="status_check"
          live={farmersOnline != null}
        />
      </div>

      <div className="flex justify-center gap-2 pb-2">
        {[{ href: "https://x.com/PumpFarmer", label: "X" }].map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noreferrer"
            aria-label={s.label}
            className="flex h-9 cursor-pointer items-center justify-center rounded-full border-2 border-[var(--rule)] bg-[var(--card)] px-3 text-[11px] font-bold text-[var(--ink-muted)] hover:border-[var(--wood-mid)]"
          >
            {s.label}
          </a>
        ))}
      </div>
    </aside>
  );
}

function StatPill({
  label,
  value,
  hint,
  icon,
  live,
}: {
  label: string;
  value: string;
  hint: string;
  icon: PixelIconId;
  live?: boolean;
}) {
  return (
    <div className="pf-stat-pill">
      <div className="flex items-center justify-center gap-1">
        <PixelIcon id={icon} size={16} />
        {live ? <span className="pf-live-dot" aria-hidden /> : null}
      </div>
      <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        {label}
      </p>
      <p className="pf-mono mt-0.5 text-sm font-bold text-[var(--ink)]">{value}</p>
      <p className="mt-0.5 text-[8px] text-[var(--ink-muted)]">{hint}</p>
    </div>
  );
}
