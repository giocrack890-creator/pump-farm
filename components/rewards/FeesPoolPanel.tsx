"use client";

import { SeasonCountdown } from "@/components/shared/SeasonCountdown";
import { HUD } from "@/components/hud/hudAssets";
import {
  hudGold,
  hudInk,
  hudInkMuted,
  hudPanel,
  hudAccent,
} from "@/components/hud/hudChrome";
import { formatNumber } from "@/lib/utils";
import {
  PAYOUT_TIER_1_SHARE,
  PAYOUT_TIER_2_SHARE,
  PAYOUT_TIER_3_SHARE,
  SILO_TARGET_ETH,
} from "@/lib/game/config";
import { SiloCoinFill } from "@/components/rewards/SiloCoinFill";

type Props = {
  /** Native fee-pot balance in ETH, or null when the chain has not answered. */
  poolEth: number | null;
  /** Live ETH/USD. Null means no dollar figure is shown at all. */
  ethUsd: number | null;
  claimableEth: number | null;
  pendingEth: number | null;
  treasuryEth: number | null;
  stale?: boolean;
  reason?: string | null;
  loading?: boolean;
  yourSp: number;
  yourProjectedEth: number;
  endsAt: string | null;
  siloTarget?: number;
};

const TIERS = [
  {
    id: "top",
    label: "Top 1%",
    share: PAYOUT_TIER_1_SHARE,
    hint: "Season leaders",
    icon: HUD.medal,
    accent: "#8a5a10",
  },
  {
    id: "mid",
    label: "Next 9%",
    share: PAYOUT_TIER_2_SHARE,
    hint: "Strong farms",
    icon: HUD.silo,
    accent: "#1a5c30",
  },
  {
    id: "rest",
    label: "Active rest",
    share: PAYOUT_TIER_3_SHARE,
    hint: "Anyone who harvested",
    icon: HUD.hype,
    accent: "#3a6a8a",
  },
] as const;

/** A dash, not a zero: an unknown figure must not read as an empty pot. */
function eth(value: number | null, digits = 4): string {
  return value == null ? "—" : `${formatNumber(value, digits)} ETH`;
}

function usd(value: number | null, ethUsd: number | null, digits = 2): string {
  if (value == null || !ethUsd) return "—";
  return `$${formatNumber(value * ethUsd, digits)}`;
}

export function FeesPoolPanel({
  poolEth,
  ethUsd,
  claimableEth,
  pendingEth,
  treasuryEth,
  stale = false,
  reason = null,
  loading = false,
  yourSp,
  yourProjectedEth,
  endsAt,
  siloTarget = SILO_TARGET_ETH,
}: Props) {
  const potUsd = poolEth != null && ethUsd ? poolEth * ethUsd : null;
  const fillPct =
    poolEth != null ? Math.min(120, Math.max(0, (poolEth / siloTarget) * 100)) : 0;

  return (
    <div className="space-y-4">
      <div className={`p-3 ${hudPanel}`}>
        <div className="mb-2 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HUD.silo} alt="" className="h-8 w-8 [image-rendering:pixelated]" />
          <p className={`text-[12px] ${hudInk}`}>Season rewards pot</p>
        </div>
        <p className={`text-[12px] leading-snug ${hudInkMuted}`}>
          A cut of every <strong className={hudInk}>$HOOD</strong> trade feeds this pot. You farm,
          earn <strong className={hudInk}>SP</strong>, and when the Season closes you get a share by
          rank. Every figure here is read from the chain — nothing is estimated.
        </p>
        {poolEth == null && loading ? (
          <p className={`mt-2 text-[11px] ${hudInkMuted}`}>Reading the chain…</p>
        ) : poolEth == null ? (
          <p className="mt-2 text-[11px] text-[#8a5a10]">
            The pot is not readable yet{reason ? ` (${reason})` : ""}. Nothing is
            shown rather than a stand-in number.
          </p>
        ) : stale ? (
          <p className="mt-2 text-[11px] text-[#8a5a10]">
            Chain did not answer the last poll — showing the last confirmed figure.
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-[0.95fr_1.05fr] md:items-start">
        <div className={`px-2 pb-3 pt-2 ${hudPanel}`}>
          <SiloCoinFill
            poolEth={poolEth ?? 0}
            fillPct={fillPct}
            potUsd={potUsd ?? 0}
            unknown={poolEth == null}
          />
        </div>

        <div className={`space-y-2 p-3 ${hudPanel}`}>
          <StatRow
            label="Your estimated share"
            value={eth(poolEth == null ? null : yourProjectedEth)}
            sub={`${usd(poolEth == null ? null : yourProjectedEth, ethUsd)} · with ${formatNumber(yourSp)} SP`}
          />
          <StatRow
            label="In the pot (on-chain)"
            value={eth(poolEth)}
            sub={
              poolEth == null
                ? loading
                  ? "reading the chain…"
                  : "unavailable"
                : `${usd(poolEth, ethUsd)} · ${fillPct.toFixed(1)}% of ${formatNumber(siloTarget, 0)} ETH target`
            }
          />
          <StatRow
            label="Claimable now / still accruing"
            value={`${eth(claimableEth, 4)} / ${eth(pendingEth, 4)}`}
            sub={
              treasuryEth != null
                ? `${eth(treasuryEth, 4)} already in treasury`
                : null
            }
          />
          <StatRow label="Pays out when" value="Season closes" sub={null} />
          <div className="pt-1">
            <SeasonCountdown endsAt={endsAt} label="Countdown" variant="hud" />
          </div>
        </div>
      </div>

      <div>
        <p className={`mb-2 text-[11px] ${hudInk}`}>How the pot splits</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {TIERS.map((t) => {
            const tierEth = poolEth == null ? null : poolEth * t.share;
            return (
              <div key={t.id} className={`p-3 ${hudPanel}`}>
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.icon} alt="" className="h-7 w-7 [image-rendering:pixelated]" />
                  <div>
                    <p className={`text-[10px] ${hudInk}`}>{t.label}</p>
                    <p className="text-[9px]" style={{ color: t.accent }}>
                      {(t.share * 100).toFixed(0)}% of pot
                    </p>
                  </div>
                </div>
                <p className={`mt-2 text-[8px] uppercase tracking-wide ${hudInkMuted}`}>Pays now</p>
                <p className={`text-lg font-bold tabular-nums ${hudAccent}`}>
                  {usd(tierEth, ethUsd, 0)}
                </p>
                <p className={`text-[9px] ${hudGold}`}>{eth(tierEth)}</p>
                <p className={`mt-1 text-[8px] ${hudInkMuted}`}>{t.hint}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string | null;
}) {
  return (
    <div className="border-b border-[#6b3e1f]/25 pb-2 last:border-0 last:pb-0">
      <p className={`text-[9px] ${hudInkMuted}`}>{label}</p>
      <p className={`text-[13px] font-bold tabular-nums ${hudInk}`}>{value}</p>
      {sub ? <p className={`text-[9px] ${hudInkMuted}`}>{sub}</p> : null}
    </div>
  );
}
