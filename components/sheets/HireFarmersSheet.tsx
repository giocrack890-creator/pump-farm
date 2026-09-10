"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FARMER_SPECIES,
  RARITY_COLOR,
  RARITY_LABEL,
  farmerHypePerSec,
  hireCost,
  ownsFarmerSpecies,
  promoteCost,
  type FarmerSpeciesId,
  type OwnedFarmer,
} from "@/lib/game/farmers";
import {
  WORKER_UPGRADES,
  type WorkerUpgradeId,
  type WorkerUpgradeLevels,
} from "@/lib/game/workerUpgrades";
import { SEED_DEFS, unlockedSeeds, type SeedTierId } from "@/lib/game/seeds";
import { formatNumber } from "@/lib/utils";
import { HudBottomSheet } from "@/components/hud/HudBottomSheet";
import { sounds } from "@/store/useSoundStore";

const ink = "font-[family-name:var(--font-pixel)] text-[#4a1e0c]";
const muted = "text-[#6b3e1f]";
const cardBase =
  "group relative flex flex-col overflow-hidden border-[3px] border-[#6b3e1f] bg-[#f3e2bc] shadow-[3px_3px_0_#3a2414] transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#3a2414] active:scale-[0.98]";
const cardAfford =
  "motion-safe:animate-[pf-afford_2.6s_ease-in-out_infinite] ring-2 ring-[#3dff7a]/55";
const cardLock =
  "relative flex flex-col overflow-hidden border-[3px] border-[#8b5a2b]/50 bg-[#e8d5a8]/80 opacity-75 grayscale-[0.35]";

const SEEN_KEY = "pumpfarm_seen_farmers_v1";

function readSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSeen(ids: Set<string>) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

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
    portrait?: string;
  };
  activity: number;
  offlineHarvest?: { crops: number; sp: number; capped: boolean } | null;
  upgrades?: WorkerUpgradeLevels;
  autoSeedTier?: SeedTierId;
  coverage?: { automated: number; total: number; fullAuto: boolean };
};

type Props = {
  open: boolean;
  hype: number;
  level: number;
  farmers: FarmersPanelState | null;
  onClose: () => void;
  onHireSpecies: (speciesId: FarmerSpeciesId) => void;
  onDeploy: (id: string) => void;
  onBench: (id: string) => void;
  onPromote: (id: string) => void;
  onClaimIdle: () => void;
  onBuyUpgrade?: (id: WorkerUpgradeId) => void;
  onSetAutoSeed?: (tier: SeedTierId) => void;
};

export function HireFarmersSheet({
  open,
  hype,
  level,
  farmers,
  onClose,
  onHireSpecies,
  onDeploy,
  onBench,
  onPromote,
  onClaimIdle,
  onBuyUpgrade,
  onSetAutoSeed,
}: Props) {
  const catalog = useMemo(
    () => Object.values(FARMER_SPECIES).sort((a, b) => a.unlockLevel - b.unlockLevel),
    [],
  );
  const sorted = useMemo(() => {
    const list = farmers?.roster ?? [];
    return [...list].sort((a, b) => Number(b.deployed) - Number(a.deployed));
  }, [farmers?.roster]);
  const seedOptions = useMemo(() => unlockedSeeds(level), [level]);
  const autoSeed = farmers?.autoSeedTier ?? "Basic";
  const coverage = farmers?.coverage;
  const fullAuto = Boolean(coverage?.fullAuto);

  const [shakeId, setShakeId] = useState<string | null>(null);
  const [flashOk, setFlashOk] = useState<string | null>(null);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const shakeTimer = useRef(0);
  const prevRoster = useRef<string[]>([]);

  useEffect(() => {
    if (open) setSeen(readSeen());
  }, [open]);

  const handleClose = () => {
    const unlocked = catalog.filter((sp) => level >= sp.unlockLevel).map((sp) => sp.id);
    const merged = new Set([...readSeen(), ...unlocked]);
    writeSeen(merged);
    setSeen(merged);
    onClose();
  };

  useEffect(() => {
    const ids = sorted.map((f) => f.id);
    const added = ids.find((id) => !prevRoster.current.includes(id));
    prevRoster.current = ids;
    if (added) {
      setFlashOk(added);
      const t = window.setTimeout(() => setFlashOk(null), 700);
      return () => window.clearTimeout(t);
    }
  }, [sorted]);

  const tryHire = (speciesId: FarmerSpeciesId, cost: number, owned: boolean) => {
    if (owned) {
      sounds.deny();
      return;
    }
    if (hype < cost) {
      sounds.deny();
      setShakeId(speciesId);
      window.clearTimeout(shakeTimer.current);
      shakeTimer.current = window.setTimeout(() => setShakeId(null), 420);
      return;
    }
    onHireSpecies(speciesId);
  };

  const tryUpgrade = (id: WorkerUpgradeId, cost: number, maxed: boolean) => {
    if (maxed || !onBuyUpgrade) return;
    if (hype < cost) {
      sounds.deny();
      setShakeId(id);
      window.clearTimeout(shakeTimer.current);
      shakeTimer.current = window.setTimeout(() => setShakeId(null), 420);
      return;
    }
    onBuyUpgrade(id);
  };

  return (
    <HudBottomSheet
      open={open}
      onClose={handleClose}
      title="Hire Farmers"
      subtitle="Hire many types (once each). Put up to 5 on the field — Deploy/Bench to choose who appears."
      ariaLabel="Hire Farmers"
      maxHeightClass="max-h-[90vh]"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 border-[2px] border-[#8b5a2b]/40 bg-[#efe0bc] px-3 py-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/icons/hype.png" alt="" className="h-5 w-5" />
        <span className={`text-[11px] tabular-nums ${ink}`}>{formatNumber(hype, 0)} Hype</span>
        <span className={`text-[9px] ${muted}`}>
          {farmers?.deployed ?? 0}/{farmers?.spots ?? 5} on field ·{" "}
          {(farmers?.hypePerSec ?? 0).toFixed(2)}/s
        </span>
        <button
          type="button"
          disabled={!farmers?.pendingIdleHype}
          onClick={onClaimIdle}
          className="ml-auto cursor-pointer border-[2px] border-[#6b3e1f] bg-[#ffe08a] px-2 py-1 text-[8px] font-bold transition active:scale-[0.98] disabled:opacity-40"
        >
          Claim idle ({formatNumber(farmers?.pendingIdleHype ?? 0, 1)})
        </button>
      </div>

      <div className="mb-3 border-[2px] border-[#8b5a2b]/40 bg-[#f6e6c4] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={`text-[10px] ${ink}`}>
            Coverage: {coverage?.automated ?? 0} / {coverage?.total ?? 0} plots automated
            {fullAuto ? (
              <span className="ml-2 border-2 border-[#1a5c30] bg-[#3dff7a] px-1.5 py-0.5 text-[8px] font-bold text-[#06140c]">
                Full Auto
              </span>
            ) : null}
          </p>
        </div>
        <label className={`mt-2 flex flex-wrap items-center gap-2 text-[9px] ${ink}`}>
          Auto-seed
          <select
            value={autoSeed}
            disabled={!onSetAutoSeed || seedOptions.length === 0}
            onChange={(e) => onSetAutoSeed?.(e.target.value as SeedTierId)}
            className="cursor-pointer border-2 border-[#6b3e1f] bg-[#fff8e8] px-2 py-1 text-[9px] font-bold outline-none"
          >
            {seedOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} · {s.hypeCost} Hype
              </option>
            ))}
          </select>
          <span className={`text-[8px] ${muted}`}>
            Workers only plant {SEED_DEFS[autoSeed]?.label ?? autoSeed}
          </span>
        </label>
        {(farmers?.deployed ?? 0) === 0 && (
          <p className={`mt-2 text-[8px] ${muted}`}>
            Hire &amp; deploy a worker to start auto plant/harvest. Tutorial crops stay manual.
          </p>
        )}
      </div>

      <p className={`mb-2 text-[10px] ${ink}`}>
        On the field ({farmers?.deployed ?? 0}/{farmers?.spots ?? 5}) — Deploy/Bench who appears
      </p>
      <ul className="mb-4 space-y-2">
        {sorted.length === 0 && (
          <li className={`border-[2px] border-[#8b5a2b]/30 bg-[#f6e6c4] px-3 py-4 text-[10px] ${muted}`}>
            No farmers yet — hire below. Up to 5 can walk the farm; use Deploy/Bench to choose.
          </li>
        )}
        {sorted.map((f) => {
          const sp = FARMER_SPECIES[f.speciesId];
          const promo = promoteCost(f.level);
          const maxLevel = f.level >= 10;
          const canUpgrade = !maxLevel && hype >= promo;
          const spring = flashOk === f.id;
          return (
            <li
              key={f.id}
              className={`flex flex-wrap items-center gap-2 border-[2px] border-[#8b5a2b]/40 bg-[#f6e6c4] px-2 py-2 transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#3a2414] active:scale-[0.98] ${
                spring
                  ? "origin-center scale-105 ring-2 ring-[#3dff7a] motion-safe:animate-[pf-bob_0.6s_ease-out_1]"
                  : ""
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sp.portrait}
                alt=""
                className="h-12 w-12 object-contain [image-rendering:pixelated]"
              />
              <div className="min-w-[120px] flex-1">
                <p className={`text-[9px] ${ink}`}>
                  {sp.name} <span className={`text-[8px] ${muted}`}>Lv{f.level}/10</span>
                </p>
                <p className="text-[8px] font-bold" style={{ color: RARITY_COLOR[sp.rarity] }}>
                  {RARITY_LABEL[sp.rarity]} · {farmerHypePerSec(f).toFixed(2)}/s
                </p>
              </div>
              <span className={`text-[8px] ${f.deployed ? "text-[#1a5c30]" : muted}`}>
                {f.deployed ? "On field" : "Benched"}
              </span>
              {f.deployed ? (
                <button
                  type="button"
                  onClick={() => onBench(f.id)}
                  className="cursor-pointer border-2 border-[#6b3e1f] bg-[#fff8e8] px-2 py-1 text-[8px] font-bold active:scale-[0.98]"
                >
                  Bench
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onDeploy(f.id)}
                  className="cursor-pointer border-2 border-[#6b3e1f] bg-[#3dff7a] px-2 py-1 text-[8px] font-bold active:scale-[0.98]"
                >
                  Deploy
                </button>
              )}
              <button
                type="button"
                disabled={maxLevel}
                onClick={() => {
                  if (maxLevel) return;
                  if (hype < promo) {
                    sounds.deny();
                    setShakeId(f.id);
                    window.clearTimeout(shakeTimer.current);
                    shakeTimer.current = window.setTimeout(() => setShakeId(null), 420);
                    return;
                  }
                  onPromote(f.id);
                }}
                className={`cursor-pointer border-2 border-[#6b3e1f] px-2 py-1 text-[8px] font-bold active:scale-[0.98] disabled:opacity-40 ${
                  canUpgrade ? `${cardAfford} bg-[#ffe08a]` : "bg-[#d4c4a0] saturate-50"
                } ${shakeId === f.id ? "motion-safe:animate-[pf-shake_0.4s_ease-in-out]" : ""}`}
              >
                {maxLevel ? "Max Lv" : `Upgrade · ${promo}`}
              </button>
            </li>
          );
        })}
      </ul>

      <p className={`mb-2 text-[10px] ${ink}`}>Hire more · once each</p>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {catalog.map((sp) => {
          const locked = level < sp.unlockLevel;
          const owned = ownsFarmerSpecies(farmers?.roster ?? [], sp.id);
          const cost = hireCost(sp.rarity, farmers?.roster.length ?? 0);
          const afford = !owned && hype >= cost;
          const shaking = shakeId === sp.id;
          const isNew = !locked && !owned && !seen.has(sp.id);
          if (locked) {
            return (
              <div key={sp.id} className={`${cardLock} relative`}>
                <div className="relative flex h-28 items-center justify-center bg-[#d4c4a0]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sp.portrait}
                    alt=""
                    className="h-20 w-20 object-contain grayscale [image-rendering:pixelated]"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-[10px] font-bold text-white">
                    Locked
                  </span>
                </div>
                <div className="px-2 py-2">
                  <p className={`text-[10px] ${ink}`}>{sp.name}</p>
                  <p className="text-[9px] font-semibold text-[#8a5a10]">
                    Farm Lvl {sp.unlockLevel}
                  </p>
                </div>
              </div>
            );
          }
          return (
            <button
              key={sp.id}
              type="button"
              disabled={owned}
              onClick={() => tryHire(sp.id, cost, owned)}
              className={`${cardBase} text-left ${
                owned
                  ? "cursor-default opacity-90 saturate-90"
                  : afford
                    ? cardAfford
                    : "opacity-70 saturate-50"
              } ${shaking ? "motion-safe:animate-[pf-shake_0.4s_ease-in-out]" : ""}`}
            >
              {owned && (
                <span className="absolute right-1 top-1 z-10 border-2 border-[#1a5c30] bg-[#3dff7a] px-1 text-[7px] font-bold text-[#06140c]">
                  OWNED
                </span>
              )}
              {isNew && (
                <span className="absolute right-1 top-1 z-10 border-2 border-[#3a2414] bg-[#ff4d4d] px-1 text-[7px] font-bold text-white">
                  NEW
                </span>
              )}
              <div className="flex h-28 items-end justify-center bg-[linear-gradient(180deg,#cfe8a8_0%,#9bc86a_70%,#8a6a3a_71%)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sp.portrait}
                  alt={sp.name}
                  className="mb-1 h-[88px] w-[88px] object-contain drop-shadow-[2px_2px_0_rgba(0,0,0,0.25)] [image-rendering:pixelated]"
                />
              </div>
              <div className="px-2 pb-2 pt-2">
                <p className={`text-[10px] leading-tight ${ink}`}>{sp.name}</p>
                <p
                  className="mt-0.5 text-[8px] font-bold"
                  style={{ color: RARITY_COLOR[sp.rarity] }}
                >
                  {RARITY_LABEL[sp.rarity]} · {sp.baseHypePerSec.toFixed(2)} Hype/s
                </p>
                <p className={`mt-1 line-clamp-2 text-[8px] leading-snug ${muted}`}>{sp.flavor}</p>
                <div className="mt-2 flex items-center justify-between border-t-2 border-[#8b5a2b]/30 pt-2">
                  <span
                    className={`text-[9px] font-bold ${
                      owned ? "text-[#1a5c30]" : shaking ? "text-[#a8433a]" : "text-[#1a5c30]"
                    }`}
                  >
                    {owned ? "Hired" : `⚡ ${cost}`}
                  </span>
                  <span className={`text-[8px] ${muted}`}>
                    +{Math.round(sp.harvestSpBoost * 100)}% SP
                  </span>
                </div>
                <span
                  className={`mt-2 block w-full border-[2px] py-1.5 text-center text-[9px] font-bold ${
                    owned
                      ? "border-[#1a5c30]/50 bg-[#c8e8b8] text-[#1a5c30]"
                      : afford
                        ? "border-[#1a5c30] bg-[#3dff7a] text-[#06140c]"
                        : "border-[#6b3e1f]/40 bg-[#d4c4a0] text-[#6b3e1f]"
                  }`}
                >
                  {owned ? "Owned · hire once" : "Hire"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mb-4 border-[2px] border-[#8b5a2b]/40 bg-[#f6e6c4] p-3">
        <p className={`mb-2 text-[10px] ${ink}`}>Idle upgrades</p>
        <ul className="space-y-2">
          {(Object.keys(WORKER_UPGRADES) as WorkerUpgradeId[])
            .filter((id) => id !== "worker_slots")
            .map((id) => {
            const def = WORKER_UPGRADES[id];
            const lv = farmers?.upgrades?.[id] ?? 0;
            const maxed = lv >= def.maxLevel;
            const cost = def.costForNext(lv);
            const afford = !maxed && hype >= cost;
            const shaking = shakeId === id;
            return (
              <li key={id} className="flex flex-wrap items-center gap-2">
                <div className="min-w-[140px] flex-1">
                  <p className={`text-[9px] ${ink}`}>
                    {def.name}{" "}
                    <span className={muted}>
                      Lv{lv}/{def.maxLevel}
                    </span>
                  </p>
                  <p className={`text-[8px] ${muted}`}>{def.blurb}</p>
                </div>
                <button
                  type="button"
                  disabled={maxed || !onBuyUpgrade}
                  onClick={() => tryUpgrade(id, cost, maxed)}
                  className={`cursor-pointer border-2 border-[#6b3e1f] px-2 py-1 text-[8px] font-bold transition active:scale-[0.98] disabled:opacity-40 ${
                    afford ? `${cardAfford} bg-[#3dff7a]` : "bg-[#d4c4a0] saturate-50"
                  } ${shaking ? "motion-safe:animate-[pf-shake_0.4s_ease-in-out]" : ""}`}
                >
                  {maxed ? "Max" : `Buy · ${cost}`}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </HudBottomSheet>
  );
}
