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
  ETH_USD_DISPLAY,
} from "@/lib/game/config";
import { SiloCoinFill } from "@/components/rewards/SiloCoinFill";

type Props = {
  /** Native fee-pot balance in ETH (Robinhood Chain gas token) */
  poolEth: number;
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

export function FeesPoolPanel({
  poolEth,
  yourSp,
  yourProjectedEth,
  endsAt,
  siloTarget = SILO_TARGET_ETH,
}: Props) {
  const potUsd = poolEth * ETH_USD_DISPLAY;
  const yourUsd = yourProjectedEth * ETH_USD_DISPLAY;
  const fillPct = Math.min(120, Math.max(0, (poolEth / siloTarget) * 100));

  return (
    <div className="space-y-4">
      <div className={`p-3 ${hudPanel}`}>
        <div className="mb-2 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HUD.silo} alt="" className="h-8 w-8 [image-rendering:pixelated]" />
          <p className={`text-[12px] ${hudInk}`}>Season rewards pot</p>
        </div>
        <p className={`text-[12px] leading-snug ${hudInkMuted}`}>
          A cut of every <strong className={hudInk}>$FARM</strong> trade feeds this pot. You farm,
          earn <strong className={hudInk}>SP</strong>, and when the Season closes you get a share by
          rank. $ amounts below are what each tier pays <em>right now</em> — not the token price.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[0.95fr_1.05fr] md:items-start">
        <div className={`px-2 pb-3 pt-2 ${hudPanel}`}>
          <SiloCoinFill poolEth={poolEth} fillPct={fillPct} potUsd={potUsd} />
        </div>

        <div className={`space-y-2 p-3 ${hudPanel}`}>
          <StatRow
            label="Your estimated share"
            value={`${formatNumber(yourProjectedEth, 4)} ETH`}
            sub={`~$${formatNumber(yourUsd, 2)} · with ${formatNumber(yourSp)} SP`}
          />
          <StatRow
            label="In the pot (on-chain)"
            value={`${formatNumber(poolEth, 4)} ETH`}
            sub={`~$${formatNumber(potUsd, 2)} · ${fillPct.toFixed(1)}% of ${formatNumber(siloTarget, 0)} ETH target`}
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
            const eth = poolEth * t.share;
            const usd = eth * ETH_USD_DISPLAY;
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
                  ${formatNumber(usd, 0)}
                </p>
                <p className={`text-[9px] ${hudGold}`}>{formatNumber(eth, 4)} ETH</p>
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
