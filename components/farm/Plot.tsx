"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import type { ClientPlot } from "@/store/useFarmStore";
import { useFarmStore } from "@/store/useFarmStore";
import { useWalletStore } from "@/store/useWalletStore";
import { SEED_TIERS, type SeedTierId } from "@/lib/game/config";
import { computeGrowthProgress } from "@/lib/game/growth";
import { cn } from "@/lib/utils";
import { HarvestBurst } from "@/components/farm/HarvestBurst";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { playHarvestChime, playPlantWhoosh } from "@/components/farm/sounds";
import { useSoundStore } from "@/store/useSoundStore";
import { toast } from "@/store/useToastStore";

type Props = {
  plot: ClientPlot;
  onChanged: () => void;
};

async function api(path: string, jwt: string, body?: object) {
  const res = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${jwt}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  return res.json();
}

function cropEmoji(status: string, progress: number): string {
  if (status === "empty") return "🟫";
  if (status === "blighted") return "🥀";
  if (status === "ready") return "🕯️";
  if (progress < 0.35) return "🌱";
  if (progress < 0.7) return "🌿";
  return "📗";
}

function ariaFor(plot: ClientPlot, progress: number): string {
  if (plot.status === "empty") {
    return `Plot ${plot.index + 1}, empty. Press Enter to plant a seed.`;
  }
  if (plot.status === "growing") {
    return `Plot ${plot.index + 1}, growing ${Math.round(progress * 100)} percent.`;
  }
  if (plot.status === "ready") {
    return `Plot ${plot.index + 1}, ready to harvest. Press Enter to harvest.`;
  }
  return `Plot ${plot.index + 1}, blighted. Harvest soon for reduced Season Points.`;
}

export function Plot({ plot, onChanged }: Props) {
  const jwt = useWalletStore((s) => s.jwt);
  const hype = useFarmStore((s) => s.hype);
  const muted = useSoundStore((s) => s.muted);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [burst, setBurst] = useState(false);
  const [tier, setTier] = useState<SeedTierId>("Basic");

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const progress =
    plot.plantedAt && plot.maturesAt
      ? computeGrowthProgress(plot.plantedAt, plot.maturesAt, new Date(now))
      : (plot.progress ?? 0);

  const plant = async () => {
    if (!jwt) return;
    setBusy(true);
    try {
      await api("/api/farm/plant", jwt, { plotId: plot.id, seedTier: tier });
      if (!muted) playPlantWhoosh();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Plant failed");
    } finally {
      setBusy(false);
    }
  };

  const harvest = async () => {
    if (!jwt) return;
    setBusy(true);
    try {
      await api("/api/farm/harvest", jwt, { plotId: plot.id });
      setBurst(true);
      if (!muted) playHarvestChime();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Harvest failed");
    } finally {
      setBusy(false);
    }
  };

  const activate = () => {
    if (busy) return;
    if (plot.status === "empty") void plant();
    else if (plot.status === "ready" || plot.status === "blighted") void harvest();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate();
    }
  };

  const tooltip =
    plot.status === "empty"
      ? "This soil is ready. Plant a seed and watch it pump."
      : plot.status === "blighted"
        ? "Uh oh — this crop's been sitting too long. Harvest before it gets rugged."
        : plot.status === "ready"
          ? "Ready to harvest! Claim your Season Points."
          : `Growing… ${Math.round(progress * 100)}%`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          layout
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          role="button"
          tabIndex={0}
          aria-label={ariaFor(plot, progress)}
          onKeyDown={onKeyDown}
          className={cn(
            "glass-panel relative flex min-h-[160px] flex-col justify-between overflow-hidden rounded-2xl border p-3 outline-none focus-visible:ring-2 focus-visible:ring-[#3DFF7A]/70",
            plot.status === "ready" && "border-[#3DFF7A]/60 glow-green animate-pulse-glow",
            plot.status === "blighted" && "border-[#FF4D4D]/50 bg-[#FF4D4D]/5",
            plot.status === "growing" && "border-[#3DFF7A]/25",
            plot.status === "empty" && "border-white/10",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wider text-white/40">
              Plot {plot.index + 1}
            </span>
            {plot.seedTier ? (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
                {plot.seedTier}
              </span>
            ) : null}
          </div>

          <div className="flex flex-1 items-center justify-center py-2 text-4xl" aria-hidden>
            {cropEmoji(plot.status, progress)}
          </div>

          {plot.status === "empty" ? (
            <div className="space-y-2">
              <label className="sr-only" htmlFor={`tier-${plot.id}`}>
                Seed tier
              </label>
              <select
                id={`tier-${plot.id}`}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs"
                value={tier}
                onChange={(e) => setTier(e.target.value as SeedTierId)}
                onClick={(e) => e.stopPropagation()}
              >
                {(Object.keys(SEED_TIERS) as SeedTierId[]).map((id) => (
                  <option
                    key={id}
                    value={id}
                    disabled={hype < SEED_TIERS[id].hypeCost}
                  >
                    {id} · {SEED_TIERS[id].hypeCost} Hype ·{" "}
                    {SEED_TIERS[id].baseYieldSp} SP
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy || !jwt}
                onClick={(e) => {
                  e.stopPropagation();
                  void plant();
                }}
                className="w-full rounded-lg bg-[#3DFF7A]/20 py-2 text-xs font-semibold text-[#3DFF7A] hover:bg-[#3DFF7A]/30 disabled:opacity-40"
              >
                Plant
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-white/45">
                <span>Growth</span>
                <span className="tabular-nums">{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    plot.status === "blighted" ? "bg-[#FF4D4D]" : "bg-[#3DFF7A]",
                  )}
                  style={{ width: `${Math.min(100, Math.max(4, progress * 100))}%` }}
                />
              </div>
              {(plot.status === "ready" || plot.status === "blighted") && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation();
                    void harvest();
                  }}
                  className={cn(
                    "w-full rounded-lg py-2 text-xs font-bold",
                    plot.status === "blighted"
                      ? "border border-[#FF4D4D]/40 text-[#FF4D4D]"
                      : "bg-gradient-to-b from-[#3DFF7A] to-[#1FCF63] text-[#06140C]",
                  )}
                >
                  {plot.status === "blighted" ? "Salvage harvest" : "Harvest"}
                </button>
              )}
            </div>
          )}
          <HarvestBurst active={burst} onDone={() => setBurst(false)} />
          <span className="sr-only">{tooltip}</span>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
