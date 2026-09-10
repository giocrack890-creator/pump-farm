"use client";

import { useQuery } from "@tanstack/react-query";
import { HudBottomSheet } from "@/components/hud/HudBottomSheet";
import { SiloMeter } from "@/components/rewards/SiloMeter";
import { PayoutCurveChart } from "@/components/rewards/PayoutCurveChart";
import { StakePanel } from "@/components/rewards/StakePanel";
import { SeasonCountdown } from "@/components/shared/SeasonCountdown";
import { useFarmStore } from "@/store/useFarmStore";
import { formatNumber } from "@/lib/utils";
import { DISCLAIMER } from "@/components/layout/Footer";
import {
  hudInk,
  hudInkMuted,
  hudPanel,
  hudPanelDark,
  hudInkLight,
  hudGold,
} from "@/components/hud/hudChrome";

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Premios de temporada (el “Silo” = el pozo donde se acumulan las fees).
 * Copy pensado para que un jugador nuevo entienda en 10 segundos.
 */
export function RewardsSheet({ open, onClose }: Props) {
  const sp = useFarmStore((s) => s.sp);

  const seasonQ = useQuery({
    queryKey: ["season"],
    queryFn: async () => (await fetch("/api/season")).json(),
    refetchInterval: open ? 30_000 : false,
    enabled: open,
  });

  const pool = Number(seasonQ.data?.pool?.displayBalance ?? 42.5);
  const endsAt = seasonQ.data?.season?.endsAt ?? null;
  const fillPct = Math.min(100, (pool / 100) * 100);
  const projectedShare = Math.max(0, sp) * 0.00015;

  return (
    <HudBottomSheet
      open={open}
      onClose={onClose}
      title="Premios de temporada"
      subtitle="Acá se reparte el pozo real cuando termina la Season."
      ariaLabel="Premios de temporada"
      maxHeightClass="max-h-[85vh]"
    >
      <div className="space-y-4">
        <div className={`space-y-2 p-3 ${hudPanel}`}>
          <p className={`text-[11px] ${hudInk}`}>¿Qué es esto?</p>
          <ol className={`list-decimal space-y-1.5 pl-4 text-[12px] leading-snug ${hudInkMuted}`}>
            <li>
              <strong className={hudInk}>Cosechás</strong> en la granja y ganás{" "}
              <strong className={hudInk}>SP</strong> (Season Points).
            </li>
            <li>
              Esas SP te dan un <strong className={hudInk}>porcentaje del pozo</strong> al final
              de la Season.
            </li>
            <li>
              El <strong className={hudInk}>Silo</strong> es solo el nombre del pozo: fees reales
              de trading de $FARM que se acumulan para repartir.
            </li>
          </ol>
          <p className={`pt-1 text-[11px] ${hudGold}`}>
            No es un depósito misterioso: es el bote de premios de esta Season.
          </p>
        </div>

        <SiloMeter
          poolAmount={pool}
          fillPct={fillPct || 68}
          seasonLabel="Pozo de esta Season (Silo)"
          helperText="Cuánto dinero hay hoy en el bote, listo para repartir cuando cierre la Season."
        />

        <div className={`p-3 ${hudPanelDark}`}>
          <p className={`text-[10px] ${hudInkLight}`}>Tu parte estimada ahora</p>
          <p className={`mt-1 text-xl tabular-nums ${hudInkLight}`}>
            ~{formatNumber(projectedShare, 4)}{" "}
            <span className="text-sm text-[#ffe08a]/80">ETH</span>
          </p>
          <p className={`mt-1 text-[11px] leading-relaxed text-[#efe0bc]/75`}>
            Con tus <strong>{formatNumber(sp)}</strong> SP actuales. Es una estimación — el pago
            final se calcula al cerrar la Season según el ranking.
          </p>
          <div className="mt-2">
            <SeasonCountdown endsAt={endsAt} label="Cierra la Season" variant="hud" />
          </div>
        </div>

        <PayoutCurveChart />
        <StakePanel />
        <p className="text-[10px] leading-relaxed text-[#5c3a1e]/80">{DISCLAIMER}</p>
      </div>
    </HudBottomSheet>
  );
}
