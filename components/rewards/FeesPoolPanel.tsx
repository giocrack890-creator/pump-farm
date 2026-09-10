"use client";

import { SeasonCountdown } from "@/components/shared/SeasonCountdown";
import { HUD } from "@/components/hud/hudAssets";
import {
  hudGold,
  hudInk,
  hudInkMuted,
  hudPanel,
  hudPanelDark,
  hudInkLight,
  hudAccent,
} from "@/components/hud/hudChrome";
import { formatNumber } from "@/lib/utils";
import {
  PAYOUT_TIER_1_SHARE,
  PAYOUT_TIER_2_SHARE,
  PAYOUT_TIER_3_SHARE,
} from "@/lib/game/config";

/** Rough display FX for USD labels — not a live price oracle. */
const ETH_USD_DISPLAY = 2460;

type Props = {
  poolEth: number;
  yourSp: number;
  yourProjectedEth: number;
  endsAt: string | null;
};

const TIERS = [
  {
    id: "top",
    label: "Top 1%",
    share: PAYOUT_TIER_1_SHARE,
    hint: "Los #1 del ranking",
    icon: HUD.medal,
    accent: "#8a5a10",
  },
  {
    id: "mid",
    label: "Siguientes 9%",
    share: PAYOUT_TIER_2_SHARE,
    hint: "Granjas fuertes",
    icon: HUD.silo,
    accent: "#1a5c30",
  },
  {
    id: "rest",
    label: "Resto activo",
    share: PAYOUT_TIER_3_SHARE,
    hint: "Quien cosechó esta Season",
    icon: HUD.hype,
    accent: "#3a6a8a",
  },
] as const;

/**
 * Fees-pool layout (hero pot + stats + tier cards) in Pump Farm wood/pixel chrome.
 */
export function FeesPoolPanel({ poolEth, yourSp, yourProjectedEth, endsAt }: Props) {
  const potUsd = poolEth * ETH_USD_DISPLAY;
  const yourUsd = yourProjectedEth * ETH_USD_DISPLAY;

  return (
    <div className="space-y-4">
      {/* Explainer — same job as CoinPot header copy */}
      <div className={`p-3 ${hudPanel}`}>
        <div className="mb-2 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HUD.silo} alt="" className="h-8 w-8 [image-rendering:pixelated]" />
          <p className={`text-[12px] ${hudInk}`}>Pozo de fees (Silo)</p>
        </div>
        <p className={`text-[12px] leading-snug ${hudInkMuted}`}>
          Una parte de cada trade de <strong className={hudInk}>$FARM</strong> cae acá. Vos
          cosechás en la granja, sumás <strong className={hudInk}>SP</strong>, y al cerrar la
          Season te toca un % del pozo según el ranking. Los $ abajo son lo que paga cada tramo{" "}
          <em>ahora</em>, no el precio del token.
        </p>
      </div>

      {/* Hero row: metrics + big pot */}
      <div className="grid gap-3 md:grid-cols-[1.05fr_0.95fr]">
        <div className={`space-y-2 p-3 ${hudPanel}`}>
          <StatRow
            label="Tu parte estimada ahora"
            value={`${formatNumber(yourProjectedEth, 4)} ETH`}
            sub={`~$${formatNumber(yourUsd, 2)} · con ${formatNumber(yourSp)} SP`}
          />
          <StatRow
            label="En el pozo (on-chain)"
            value={`${formatNumber(poolEth, 4)} ETH`}
            sub={`~$${formatNumber(potUsd, 2)}`}
          />
          <StatRow
            label="Se reparte cuando"
            value="Cierra la Season"
            sub={null}
          />
          <div className="pt-1">
            <SeasonCountdown endsAt={endsAt} label="Cuenta regresiva" variant="hud" />
          </div>
        </div>

        <div
          className={`relative flex flex-col items-center justify-center overflow-hidden p-4 text-center ${hudPanelDark}`}
        >
          <p className="text-[9px] uppercase tracking-wider text-[#efe0bc]/70">
            Acumulado en el pozo
          </p>
          <p className={`mt-2 text-4xl font-black tabular-nums leading-none text-[#7bb85c] md:text-5xl`}>
            ${formatNumber(potUsd, 2)}
          </p>
          <p className={`mt-2 flex items-center gap-1.5 text-[10px] ${hudInkLight}`}>
            <span className="inline-block h-2 w-2 rounded-full bg-[#7bb85c]" />
            Live on-chain · {formatNumber(poolEth, 4)} ETH
          </p>
          <p className={`mt-3 max-w-[220px] text-[10px] leading-snug text-[#efe0bc]/70`}>
            Más SP = más chance de caer en un tramo que paga más.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HUD.silo}
            alt=""
            className="pointer-events-none absolute -bottom-2 -right-2 h-16 w-16 opacity-25 [image-rendering:pixelated]"
          />
        </div>
      </div>

      {/* Tier cards — like CoinPot coin cards, but farm ranks */}
      <div>
        <p className={`mb-2 text-[11px] ${hudInk}`}>Cómo se parte el pozo</p>
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
                      {(t.share * 100).toFixed(0)}% del pozo
                    </p>
                  </div>
                </div>
                <p className={`mt-2 text-[8px] uppercase tracking-wide ${hudInkMuted}`}>Paga ahora</p>
                <p className={`text-lg font-bold tabular-nums ${hudAccent}`}>
                  ${formatNumber(usd, 2)}
                </p>
                <p className={`text-[10px] ${hudGold}`}>{formatNumber(eth, 4)} ETH</p>
                <p className={`mt-1 text-[9px] ${hudInkMuted}`}>{t.hint}</p>
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
    <div className="flex items-start justify-between gap-3 border-b border-[#5c3a1e]/25 pb-2 last:border-0 last:pb-0">
      <p className={`text-[11px] ${hudInkMuted}`}>{label}</p>
      <div className="text-right">
        <p className={`text-[12px] tabular-nums ${hudInk}`}>{value}</p>
        {sub ? <p className={`text-[9px] ${hudInkMuted}`}>{sub}</p> : null}
      </div>
    </div>
  );
}
