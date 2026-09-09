"use client";

import { useMemo } from "react";
import {
  FARMER_SPECIES,
  RARITY_COLOR,
  RARITY_LABEL,
  hireCost,
  promoteCost,
  type OwnedFarmer,
} from "@/lib/game/farmers";
import { formatNumber } from "@/lib/utils";

const wood =
  "border-[4px] border-[#6b3e1f] bg-[#e8c48a] shadow-[inset_2px_2px_0_#f5deb0,inset_-2px_-2px_0_#a86f3a,4px_4px_0_#3a2414]";
const parchment = "border-[3px] border-[#8b5a2b] bg-[#f6e6c4]";
const ink = "font-[family-name:var(--font-pixel)] text-[#4a1e0c]";
const inkMuted = "text-[#6b3e1f]";

export type FarmersPanelState = {
  roster: OwnedFarmer[];
  spots: number;
  deployed: number;
  hypePerSec: number;
  pendingIdleHype: number;
  scoutReadyAt: number;
  pendingScout: null | {
    speciesId: string;
    name: string;
    rarity: string;
    flavor: string;
    baseHypePerSec: number;
  };
  activity: number;
};

type Props = {
  open: boolean;
  hype: number;
  farmers: FarmersPanelState | null;
  onClose: () => void;
  onScout: () => void;
  onHire: () => void;
  onDismissScout: () => void;
  onDeploy: (id: string) => void;
  onBench: (id: string) => void;
  onPromote: (id: string) => void;
  onClaimIdle: () => void;
};

export function HireFarmersSheet({
  open,
  hype,
  farmers,
  onClose,
  onScout,
  onHire,
  onDismissScout,
  onDeploy,
  onBench,
  onPromote,
  onClaimIdle,
}: Props) {
  const now = Date.now();
  const scoutCd = Math.max(0, Math.ceil(((farmers?.scoutReadyAt ?? 0) - now) / 1000));
  const pending = farmers?.pendingScout;
  const hirePrice = pending
    ? hireCost(pending.rarity as "common" | "rare" | "epic" | "legendary", farmers?.roster.length ?? 0)
    : 0;

  const sorted = useMemo(() => {
    const list = farmers?.roster ?? [];
    return [...list].sort((a, b) => Number(b.deployed) - Number(a.deployed));
  }, [farmers?.roster]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center sm:p-4">
      <div
        className={`flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden ${wood}`}
        role="dialog"
        aria-label="Hire Farmers"
      >
        <div className="flex items-center justify-between border-b-[3px] border-[#6b3e1f] bg-[#c9965a] px-3 py-2">
          <p className={`text-[11px] ${ink}`}>Pierre&apos;s Field Office — Hire Farmers</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center border-[3px] border-[#6b3e1f] bg-[#c44] text-sm font-bold text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 md:grid-cols-[140px_1fr]">
          {/* Portrait + dialogue — Stardew shop left column */}
          <div className="flex flex-col gap-2">
            <div className={`flex aspect-square items-center justify-center ${parchment}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/sprites/companions/pet.png"
                alt="Foreman"
                className="h-24 w-24 object-contain [image-rendering:pixelated]"
              />
            </div>
            <div className={`p-2 ${parchment}`}>
              <p className={`text-[8px] leading-relaxed ${ink}`}>
                Welcome to the Field Office! Scout hands, hire &apos;em with Hype, deploy on field
                spots — they earn Hype idle and boost harvests.
              </p>
            </div>
            <div className={`flex items-center gap-2 px-2 py-1.5 ${parchment}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/icons/hype.png" alt="" className="h-5 w-5" />
              <span className={`text-[11px] tabular-nums ${ink}`}>{formatNumber(hype, 0)}</span>
            </div>
          </div>

          {/* Shop list + roster */}
          <div className="flex min-h-0 flex-col gap-3">
            <div className={`p-3 ${parchment}`}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className={`text-[10px] ${ink}`}>
                  Floor · {farmers?.deployed ?? 0}/{farmers?.spots ?? 3} spots · Activity ×
                  {(farmers?.activity ?? 1).toFixed(1)}
                </p>
                <p className={`text-[9px] ${inkMuted}`}>
                  {(farmers?.hypePerSec ?? 0).toFixed(2)} Hype/s idle
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={scoutCd > 0}
                  onClick={onScout}
                  className="cursor-pointer border-[3px] border-[#6b3e1f] bg-[#3dff7a] px-3 py-2 text-[9px] font-bold text-[#06140c] disabled:opacity-40"
                >
                  {scoutCd > 0 ? `Scout (${scoutCd}s)` : "Scout farmer"}
                </button>
                <button
                  type="button"
                  disabled={!farmers?.pendingIdleHype}
                  onClick={onClaimIdle}
                  className="cursor-pointer border-[3px] border-[#6b3e1f] bg-[#ffe08a] px-3 py-2 text-[9px] font-bold text-[#4a1e0c] disabled:opacity-40"
                >
                  Claim idle ({formatNumber(farmers?.pendingIdleHype ?? 0, 1)} Hype)
                </button>
              </div>

              {pending && (
                <div className="mt-3 flex flex-wrap items-center gap-3 border-t-2 border-[#8b5a2b]/40 pt-3">
                  <div>
                    <p className={`text-[10px] ${ink}`}>{pending.name}</p>
                    <p
                      className="text-[9px] font-bold"
                      style={{ color: RARITY_COLOR[pending.rarity as keyof typeof RARITY_COLOR] }}
                    >
                      {RARITY_LABEL[pending.rarity as keyof typeof RARITY_LABEL]} ·{" "}
                      {pending.baseHypePerSec}/s
                    </p>
                    <p className={`mt-1 text-[10px] ${inkMuted}`}>{pending.flavor}</p>
                  </div>
                  <button
                    type="button"
                    disabled={hype < hirePrice}
                    onClick={onHire}
                    className="cursor-pointer border-[3px] border-[#6b3e1f] bg-[#3dff7a] px-3 py-2 text-[9px] font-bold disabled:opacity-40"
                  >
                    Hire · {hirePrice} Hype
                  </button>
                  <button
                    type="button"
                    onClick={onDismissScout}
                    className={`cursor-pointer text-[9px] underline ${inkMuted}`}
                  >
                    Pass
                  </button>
                </div>
              )}
            </div>

            <div className={`min-h-0 flex-1 overflow-y-auto ${parchment}`}>
              <div className="sticky top-0 border-b-2 border-[#8b5a2b]/50 bg-[#f6e6c4] px-3 py-2">
                <p className={`text-[10px] ${ink}`}>Your roster</p>
              </div>
              <ul>
                {sorted.length === 0 && (
                  <li className={`px-3 py-4 text-sm ${inkMuted}`}>
                    No farmers yet — Scout to find your first Field Hand.
                  </li>
                )}
                {sorted.map((f) => {
                  const sp = FARMER_SPECIES[f.speciesId];
                  const promo = promoteCost(f.level);
                  return (
                    <li
                      key={f.id}
                      className="flex flex-wrap items-center gap-2 border-b border-[#8b5a2b]/35 px-3 py-2"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/assets/sprites/companions/pet.png"
                        alt=""
                        className="h-10 w-10 object-contain [image-rendering:pixelated]"
                      />
                      <div className="min-w-[120px] flex-1">
                        <p className={`text-[9px] ${ink}`}>
                          {sp.name}{" "}
                          <span className="text-[8px] text-[#6b3e1f]">Lv{f.level}</span>
                        </p>
                        <p
                          className="text-[8px] font-bold"
                          style={{ color: RARITY_COLOR[sp.rarity] }}
                        >
                          {RARITY_LABEL[sp.rarity]} · {sp.baseHypePerSec}/s base
                        </p>
                      </div>
                      <span className={`text-[8px] ${f.deployed ? "text-[#1a5c30]" : inkMuted}`}>
                        {f.deployed ? "On field" : "Benched"}
                      </span>
                      {f.deployed ? (
                        <button
                          type="button"
                          onClick={() => onBench(f.id)}
                          className="cursor-pointer border-2 border-[#6b3e1f] bg-[#fff8e8] px-2 py-1 text-[8px] font-bold"
                        >
                          Bench
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onDeploy(f.id)}
                          className="cursor-pointer border-2 border-[#6b3e1f] bg-[#3dff7a] px-2 py-1 text-[8px] font-bold"
                        >
                          Deploy
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={f.level >= 10 || hype < promo}
                        onClick={() => onPromote(f.id)}
                        className="cursor-pointer border-2 border-[#6b3e1f] bg-[#ffe08a] px-2 py-1 text-[8px] font-bold disabled:opacity-40"
                      >
                        Promote · {promo}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Inventory-style hotbar strip */}
            <div className={`grid grid-cols-8 gap-1 p-2 ${parchment}`}>
              {Array.from({ length: 8 }).map((_, i) => {
                const f = (farmers?.roster ?? []).filter((x) => x.deployed)[i];
                return (
                  <div
                    key={i}
                    className="flex aspect-square items-center justify-center border-2 border-[#8b5a2b] bg-[#efe0bc]"
                  >
                    {f ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src="/assets/sprites/companions/pet.png"
                        alt=""
                        className="h-7 w-7 object-contain [image-rendering:pixelated]"
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
