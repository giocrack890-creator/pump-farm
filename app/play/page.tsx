"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LeftIconColumn,
  BottomNav,
  QuestTicket,
  ShortcutIcons,
  LevelUpOverlay,
} from "@/components/hud/GameHud";
import { StardewTopHud } from "@/components/hud/StardewTopHud";
import { PoolHudChip } from "@/components/hud/PoolHudChip";
import {
  TutorialOverlay,
  type TutorialStepId,
} from "@/components/tutorial/TutorialOverlay";
import { PlantPickerSheet } from "@/components/sheets/PlantPickerSheet";
import { AlmanacSheet } from "@/components/sheets/AlmanacSheet";
import { CompanionSheet } from "@/components/sheets/CompanionSheet";
import { ExpandLandSheet } from "@/components/sheets/ExpandLandSheet";
import {
  HireFarmersSheet,
  type FarmersPanelState,
} from "@/components/sheets/HireFarmersSheet";
import { RewardsSheet } from "@/components/sheets/RewardsSheet";
import { RanksSheet } from "@/components/sheets/RanksSheet";
import { ShopSheet, type AnimalsPanelState } from "@/components/sheets/ShopSheet";
import { NpcDialogue, NPC_TAP_LINES, type NpcId } from "@/components/hud/NpcDialogue";
import { WalletButton } from "@/components/layout/WalletButton";
import { FarmEnterGate } from "@/components/play/FarmEnterGate";
import { FarmerNameGate } from "@/components/play/FarmerNameGate";
import { DISCLAIMER } from "@/components/layout/Footer";
import { useFarmStore } from "@/store/useFarmStore";
import { useWalletStore } from "@/store/useWalletStore";
import { useSeasonStore } from "@/store/useSeasonStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useSoundStore, sounds } from "@/store/useSoundStore";
import { useAmbientMusic } from "@/hooks/useAmbientMusic";
import { toast } from "@/store/useToastStore";
import { HarvestFlyLayer, type FlyFx } from "@/components/hud/HarvestFlyLayer";
import { WeatherLayer } from "@/components/farm/WeatherLayer";
import type { FarmCanvasHandle } from "@/game/FarmCanvas";
import { FARMER_SPECIES, farmerHypePerSec, type FarmerSpeciesId } from "@/lib/game/farmers";
import { ANIMAL_SPECIES, type AnimalSpeciesId } from "@/lib/game/animals";
import type { SeedTierId } from "@/lib/game/seeds";
import { coverageUpgradeBonus } from "@/lib/game/autoHarvest";
import type { CompanionId } from "@/lib/game/companions";
import type { ScenePlot } from "@/game/FarmScene";
import { soilCellForPlotIndex } from "@/game/farmLayout";
import { hydrateDemoFromLocal, writeDemoSaveLocal } from "@/lib/demo/clientSave";
import { utcDayKey } from "@/lib/game/hype";

const TUTORIAL_DONE_KEY = "pumpfarm_tutorial_done_v1";

function readTutorialDoneLocal(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(TUTORIAL_DONE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeTutorialDoneLocal() {
  try {
    window.localStorage.setItem(TUTORIAL_DONE_KEY, "1");
  } catch {
    /* ignore */
  }
}

const FarmCanvas = dynamic(
  () => import("@/game/FarmCanvas").then((m) => m.FarmCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-dvh items-center justify-center bg-[#92c868] text-[#1a1008]/70">
        Loading farm…
      </div>
    ),
  },
);

export default function PlayPage() {
  const router = useRouter();
  const jwt = useWalletStore((s) => s.jwt);
  const hasHydrated = useWalletStore((s) => s.hasHydrated);
  const displayName = useWalletStore((s) => s.displayName);
  const setDisplayName = useWalletStore((s) => s.setDisplayName);
  const syncFromServer = useFarmStore((s) => s.syncFromServer);
  const plots = useFarmStore((s) => s.plots);
  const hype = useFarmStore((s) => s.hype);
  const sp = useFarmStore((s) => s.sp);
  const setSeason = useSeasonStore((s) => s.setSeason);
  const endsAt = useSeasonStore((s) => s.endsAt);
  const level = usePlayerStore((s) => s.level);
  const gridSize = usePlayerStore((s) => s.gridSize);
  const companionId = usePlayerStore((s) => s.companionId);
  const barnTier = usePlayerStore((s) => s.barnTier);
  const addXp = usePlayerStore((s) => s.addXp);
  const setXp = usePlayerStore((s) => s.setXp);
  const bumpQuest = usePlayerStore((s) => s.bumpQuestHarvest);
  const questHarvest = usePlayerStore((s) => s.questHarvestToday);
  const setCompanionId = usePlayerStore((s) => s.setCompanionId);
  const sfxMuted = useSoundStore((s) => s.muted);
  const toggleSfxMuted = useSoundStore((s) => s.toggleMuted);
  const musicMuted = useSoundStore((s) => s.musicMuted);
  const toggleMusicMuted = useSoundStore((s) => s.toggleMusicMuted);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const { unlocked: musicUnlocked, showMuted: musicHudMuted } = useAmbientMusic({
    duck: levelUp != null,
  });

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  /** Once true, keep the Phaser farm mounted even if a poll fails. */
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [needsName, setNeedsName] = useState(false);
  const [plantPlot, setPlantPlot] = useState<ScenePlot | null>(null);
  const [nav, setNav] = useState("shop");
  const [panel, setPanel] = useState<
    "almanac" | "companion" | "expand" | "farmers" | "shop" | "rewards" | "ranks" | null
  >(null);
  const [farmers, setFarmers] = useState<FarmersPanelState | null>(null);
  const [animals, setAnimals] = useState<AnimalsPanelState | null>(null);
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [offlineBanner, setOfflineBanner] = useState<string | null>(null);
  const [weather, setWeather] = useState("Sunny");
  const [burstId, setBurstId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(true);
  const [tutorialStep, setTutorialStep] = useState<TutorialStepId | null>(null);
  const [tutorialReplay, setTutorialReplay] = useState(false);
  const [tutorialPlantId, setTutorialPlantId] = useState<string | null>(null);
  const [instantReadyId, setInstantReadyId] = useState<string | null>(null);
  const [expandPulse, setExpandPulse] = useState(0);
  const [npcTip, setNpcTip] = useState<{ npc: NpcId; text: string } | null>(null);
  const [harvestCombo, setHarvestCombo] = useState(1);
  const [flyFx, setFlyFx] = useState<FlyFx[]>([]);
  const farmRef = useRef<FarmCanvasHandle | null>(null);
  const comboTimer = useRef(0);
  const lastHarvestAt = useRef(0);
  const harvestComboRef = useRef(1);

  const scenePlots: ScenePlot[] = useMemo(
    () =>
      plots.map((p, i) => {
        const idx = typeof p.index === "number" ? p.index : i;
        const cell = soilCellForPlotIndex(idx);
        // DB plots have no grid coords — never use 0..gridSize local indices (soil is world tiles).
        const hasWorldCell =
          typeof p.gridX === "number" &&
          typeof p.gridY === "number" &&
          (p.gridX >= 16 || p.gridY >= 12);
        return {
          id: p.id,
          index: idx,
          gridX: hasWorldCell ? p.gridX! : cell.gridX,
          gridY: hasWorldCell ? p.gridY! : cell.gridY,
          seedTier: p.seedTier,
          plantedAt: p.plantedAt,
          maturesAt: p.maturesAt,
          status: p.status,
        };
      }),
    [plots],
  );

  const tutorialActive = tutorialStep != null && tutorialStep !== "done";

  const highlightPlot = useMemo(() => {
    if (!tutorialStep) return null;
    if (tutorialStep === "tap-plot") {
      const empty = scenePlots.find((p) => p.status === "empty");
      return empty ? { gridX: empty.gridX, gridY: empty.gridY } : null;
    }
    if (tutorialStep === "harvest" && tutorialPlantId) {
      const p = scenePlots.find((x) => x.id === tutorialPlantId);
      return p ? { gridX: p.gridX, gridY: p.gridY } : null;
    }
    if (tutorialStep === "growth" && tutorialPlantId) {
      const p = scenePlots.find((x) => x.id === tutorialPlantId);
      return p ? { gridX: p.gridX, gridY: p.gridY } : null;
    }
    return null;
  }, [tutorialStep, scenePlots, tutorialPlantId]);

  const completeTutorialServer = useCallback(async () => {
    if (!jwt) return;
    try {
      await fetch("/api/farm/tutorial", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "complete" }),
      });
    } catch {
      /* demo still advances locally */
    }
    writeTutorialDoneLocal();
    setHasCompletedTutorial(true);
    setTutorialReplay(false);
    setTutorialStep(null);
    setInstantReadyId(null);
    setTutorialPlantId(null);
  }, [jwt]);

  const lastHydrateAt = useRef(0);

  const refresh = useCallback(async (opts?: { skipHydrate?: boolean }) => {
    if (!jwt) {
      setLoading(false);
      if (!hasLoadedOnce) setLoadError(true);
      return;
    }
    try {
      // Hydrate at most every 12s — cold instances need it; rapid upgrades must not wait on it.
      const now = Date.now();
      if (!opts?.skipHydrate && now - lastHydrateAt.current > 12_000) {
        await hydrateDemoFromLocal(jwt);
        lastHydrateAt.current = now;
      }

      const res = await fetch("/api/farm", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) {
        // Soft-fail after first load — never unmount Phaser for a flaky poll.
        if (!hasLoadedOnce) setLoadError(true);
        return;
      }
      const data = await res.json();
      if (data.demoSave) {
        writeDemoSaveLocal(data.demoSave);
      }
      syncFromServer({
        plots: data.plots,
        hype: Number(data.wallet?.hypeBalance ?? 0),
        sp: Number(data.seasonPoints ?? 0),
        harvestStreak: Number(data.wallet?.harvestStreak ?? 0),
        referralCode: data.wallet?.referralCode ?? null,
        weather: data.weather ?? "Sunny",
        goldenHarvestActive: Boolean(data.goldenHarvest?.active),
      });
      if (data.wallet?.xp != null) setXp(Number(data.wallet.xp));
      if (data.wallet?.gridSize) usePlayerStore.getState().setGridSize(data.wallet.gridSize);
      if (typeof data.wallet?.displayName === "string" && data.wallet.displayName) {
        setDisplayName(data.wallet.displayName);
        setNeedsName(false);
      } else if (!useWalletStore.getState().displayName) {
        setNeedsName(true);
      }
      if (data.farmers) {
        const panelData = data.farmers as FarmersPanelState;
        const oh = panelData.offlineHarvest;
        // Server only emits this after ≥90s away — set once per payload (don't stack while open).
        if (oh && oh.crops > 0) {
          setOfflineBanner((prev) => {
            if (prev) return prev;
            const msg = `Welcome back — your workers auto-farmed ${oh.crops} crop${oh.crops === 1 ? "" : "s"} (+${oh.sp} SP)${oh.capped ? " (8h cap)" : ""} while you were away.`;
            toast.info(msg, 5200);
            return msg;
          });
        }
        setFarmers({ ...panelData, offlineHarvest: null });
      }
      if (data.animals) {
        setAnimals(data.animals as AnimalsPanelState);
      }
      const lastDaily = data.wallet?.lastDailyHypeAt as string | null | undefined;
      setDailyClaimed(Boolean(lastDaily && lastDaily.slice(0, 10) === utcDayKey()));
      if (data.weather) setWeather(String(data.weather));
      if (data.season) {
        setSeason({
          id: data.season.id,
          number: data.season.number,
          endsAt: data.season.endsAt,
        });
      }
      const done = Boolean(data.wallet?.hasCompletedTutorial) || readTutorialDoneLocal();
      setHasCompletedTutorial(done);
      if (done) writeTutorialDoneLocal();
      if (!done && !tutorialReplay) {
        setTutorialStep((prev) => prev ?? "welcome");
      } else if (done && !tutorialReplay) {
        setTutorialStep(null);
      }
      setHasLoadedOnce(true);
      setLoadError(false);
    } catch {
      if (!hasLoadedOnce) setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [jwt, syncFromServer, setSeason, setXp, setDisplayName, tutorialReplay, hasLoadedOnce]);

  useEffect(() => {
    void refresh();
    if (!jwt) return;
    const id = setInterval(() => void refresh(), 4000);
    return () => clearInterval(id);
  }, [refresh, jwt]);

  const seasonLabel = endsAt
    ? `Season ends ${new Date(endsAt).toLocaleString()} — keep harvesting!`
    : "Demo Season — plant, grow, harvest, pump.";

  const onPlotTap = async (plot: ScenePlot) => {
    if (tutorialStep === "tap-plot" && plot.status === "empty") {
      setPlantPlot(plot);
      setTutorialStep("pick-seed");
      return;
    }
    if (plot.status === "empty") {
      setPlantPlot(plot);
      return;
    }
    if (plot.status === "ready" || plot.status === "blighted") {
      await runHarvest(plot);
    }
  };

  const playHarvestJuice = (
    plot: ScenePlot,
    data: {
      pointsAwarded?: number;
      spGained?: number;
      points?: number;
      awarded?: number;
      xpGained?: number;
      xp?: number;
    },
  ) => {
    const now = Date.now();
    const combo =
      now - lastHarvestAt.current < 2200
        ? Math.min(5, harvestComboRef.current + 1)
        : 1;
    lastHarvestAt.current = now;
    harvestComboRef.current = combo;
    setHarvestCombo(combo);
    window.clearTimeout(comboTimer.current);
    comboTimer.current = window.setTimeout(() => {
      harvestComboRef.current = 1;
      setHarvestCombo(1);
    }, 2400);

    const tier = plot.seedTier ?? "Basic";
    sounds.harvest(tier);
    const screen = farmRef.current?.getPlotScreenPoint(plot.id) ?? {
      x: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
      y: typeof window !== "undefined" ? window.innerHeight * 0.45 : 0,
    };
    const spGain = Number(
      data.pointsAwarded ?? data.awarded ?? data.spGained ?? data.points ?? 10,
    );
    setFlyFx((prev) => [
      ...prev.slice(-4),
      {
        id: `fly-${now}-${plot.id}`,
        kind: "sp",
        amount: Math.max(1, Math.round(spGain)),
        from: screen,
      },
    ]);
    setBurstId(plot.id);
    setInstantReadyId(null);
    const prevQuest = questHarvest;
    bumpQuest();
    if (prevQuest < 3 && prevQuest + 1 >= 3) {
      toast.quest("Harvest 3 crops today ✓ — streak fuel secured!");
    }
    if (data.xpGained) {
      const r = addXp(Number(data.xpGained));
      if (r.leveled) {
        setLevelUp(r.level);
        toast.levelUp(`Level ${r.level} — new unlocks incoming!`);
      }
    } else if (data.xp != null) {
      setXp(Number(data.xp));
    }
    setTimeout(() => setBurstId(null), 800);
  };

  const runHarvest = async (plot: ScenePlot, opts?: { fromWorker?: boolean }) => {
    if (!jwt) return;
    await hydrateDemoFromLocal(jwt);
    const res = await fetch("/api/farm/harvest", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plotId: plot.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (!opts?.fromWorker) toast.error(data.error ?? "Harvest failed");
      return;
    }
    if (data.demoSave) writeDemoSaveLocal(data.demoSave);
    playHarvestJuice(plot, data);
    await refresh();
    if (!opts?.fromWorker && tutorialStep === "harvest") setTutorialStep("xp");
  };

  const onWorkerHarvest = (plot: ScenePlot, _workerId: string) => {
    void runHarvest(plot, { fromWorker: true });
  };

  const onWorkerPlant = async (plot: ScenePlot, _workerId: string, seedTier: SeedTierId) => {
    if (!jwt) return;
    await hydrateDemoFromLocal(jwt);
    const res = await fetch("/api/farm/plant", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plotId: plot.id, seedTier }),
    });
    if (!res.ok) return;
    const plantData = await res.json().catch(() => null);
    if (plantData?.demoSave) writeDemoSaveLocal(plantData.demoSave);
    sounds.plant();
    await refresh();
  };

  const onPlant = async (tier: SeedTierId) => {
    if (!jwt || !plantPlot) return;
    await hydrateDemoFromLocal(jwt);
    const res = await fetch("/api/farm/plant", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plotId: plantPlot.id, seedTier: tier }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Plant failed");
      return;
    }
    if (data.demoSave) writeDemoSaveLocal(data.demoSave);
    sounds.plant();
    const plantedId = plantPlot.id;
    setPlantPlot(null);
    await refresh();
    if (tutorialStep === "pick-seed") {
      setTutorialPlantId(plantedId);
      setTutorialStep("growth");
    }
  };

  const onTutorialInstantGrow = async () => {
    if (!jwt || !tutorialPlantId) return;
    const res = await fetch("/api/farm/tutorial", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
        body: JSON.stringify({
          action: "instant-grow",
          plotId: tutorialPlantId,
          replay: tutorialReplay,
        }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Instant grow failed");
      return;
    }
    setInstantReadyId(tutorialPlantId);
    await refresh();
    setTutorialStep("harvest");
  };

  const farmerBusy = useRef(false);

  const farmerAction = async (
    action: string,
    farmerId?: string,
    upgradeId?: string,
    speciesId?: string,
    seedTier?: string,
  ) => {
    if (!jwt || farmerBusy.current) return;
    farmerBusy.current = true;
    const fast =
      action === "promote" ||
      action === "buy-upgrade" ||
      action === "deploy" ||
      action === "bench" ||
      action === "set-auto-seed";
    try {
      // Fast desk actions skip hydrate — warm instance + local write after is enough.
      if (!fast) {
        await hydrateDemoFromLocal(jwt);
        lastHydrateAt.current = Date.now();
      }
      const res = await fetch("/api/farm/farmers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, farmerId, upgradeId, speciesId, seedTier }),
      });
      const data = await res.json();
      if (!res.ok) {
        sounds.deny();
        toast.error(data.error ?? "Action failed");
        return;
      }
      if (data.demoSave) writeDemoSaveLocal(data.demoSave);
      if (data.hypeBalance != null) {
        syncFromServer({ hype: Number(data.hypeBalance) });
      }
      if (data.farmers) {
        setFarmers({ ...(data.farmers as FarmersPanelState), offlineHarvest: null });
      }
      if (action === "hire-species" || action === "buy-upgrade" || action === "promote") {
        sounds.buy();
      }
      if (fast) {
        // UI already patched — no blocking full refresh
        return;
      }
      await refresh({ skipHydrate: true });
    } finally {
      farmerBusy.current = false;
    }
  };

  const onBuyAnimal = async (speciesId: AnimalSpeciesId) => {
    if (!jwt) return;
    const res = await fetch("/api/farm/animals", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "buy", speciesId }),
    });
    const data = await res.json();
    if (!res.ok) {
      sounds.deny();
      toast.error(data.error ?? "Could not buy animal");
      return;
    }
    sounds.buy();
    const name = ANIMAL_SPECIES[speciesId]?.name ?? speciesId;
    toast.success(`${name} joined the yard`);
    await refresh();
  };

  const onClaimAnimalIdle = async () => {
    if (!jwt) return;
    const res = await fetch("/api/farm/animals", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "claim-idle" }),
    });
    const data = await res.json();
    if (!res.ok) {
      sounds.deny();
      toast.error(data.error ?? "Nothing to claim");
      return;
    }
    sounds.currencyDing();
    toast.success(`+${Number(data.awarded ?? 0).toFixed(2)} animal Hype claimed`);
    await refresh();
  };

  const onClaimDaily = async () => {
    if (!jwt) return;
    const res = await fetch("/api/farm/claim-daily", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const data = await res.json();
    if (!res.ok) {
      sounds.deny();
      toast.error(data.error ?? "Already claimed today");
      return;
    }
    sounds.currencyDing();
    toast.success(`+${data.awarded ?? data.amount ?? 50} Hype claimed for today`);
    setDailyClaimed(true);
    await refresh();
  };

  const onExpand = async () => {
    if (!jwt) return;
    const res = await fetch("/api/farm/expand", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Expand failed");
      return;
    }
    if (data.gridSize) usePlayerStore.getState().setGridSize(data.gridSize);
    setExpandPulse((n) => n + 1);
    setPanel(null);
    await refresh();
  };

  const onTutorialNext = () => {
    if (!tutorialStep) return;
    const order: TutorialStepId[] = [
      "welcome",
      "tap-plot",
      "pick-seed",
      "growth",
      "harvest",
      "xp",
      "silo",
      "nav",
      "done",
    ];
    const i = order.indexOf(tutorialStep);
    if (tutorialStep === "welcome") {
      setTutorialStep("tap-plot");
      return;
    }
    if (tutorialStep === "growth") {
      // Require instant-grow or continue after it — CTA just acknowledges if already ready
      if (instantReadyId) setTutorialStep("harvest");
      return;
    }
    if (tutorialStep === "xp") {
      setTutorialStep("silo");
      return;
    }
    if (tutorialStep === "silo") {
      setTutorialStep("nav");
      return;
    }
    if (tutorialStep === "nav" || tutorialStep === "done") {
      void completeTutorialServer();
      return;
    }
    // Don't skip action-required steps via Next
    if (["tap-plot", "pick-seed", "harvest"].includes(tutorialStep)) return;
    if (i >= 0 && i < order.length - 1) setTutorialStep(order[i + 1]!);
  };

  // Wait for localStorage auth before deciding "no session" (avoids gate flash).
  if (!hasHydrated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#92c868] text-[#1a1008]/70">
        Loading farm…
      </div>
    );
  }

  // Only kick to gate when there is truly no session, or the first load failed.
  // Mid-session poll/SIWX blips must not unmount the farm.
  if ((!jwt && !hasLoadedOnce) || (loadError && !hasLoadedOnce)) {
    return (
      <FarmEnterGate
        loadError={loadError}
        onClearSession={() => {
          useWalletStore.getState().clearAuth();
          setLoadError(false);
          setHasLoadedOnce(false);
        }}
      />
    );
  }

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-[#92c868]">
      {!loading && (
        <FarmCanvas
          ref={farmRef}
          onReady={(h) => {
            farmRef.current = h;
          }}
          gridSize={gridSize}
          plots={scenePlots}
          farmLevel={level}
          siloTier={1}
          barnTier={barnTier}
          onPlotTap={onPlotTap}
          onExpandTap={() => setPanel("expand")}
          onBarnTap={() =>
            setNpcTip({ npc: "foreman", text: NPC_TAP_LINES.foreman })
          }
          onSiloTap={() => {
            if (tutorialStep === "silo") setTutorialStep("nav");
            setPanel("rewards");
          }}
          onNpcTap={(npc) => setNpcTip({ npc, text: NPC_TAP_LINES[npc] })}
          onWorkerHarvest={onWorkerHarvest}
          onWorkerPlant={(plot, workerId, tier) => void onWorkerPlant(plot, workerId, tier)}
          harvestBurstPlotId={burstId}
          harvestCombo={harvestCombo}
          highlightPlot={highlightPlot}
          tutorialInstantReadyPlotId={instantReadyId}
          expandPulse={expandPulse}
          workers={(farmers?.roster ?? []).map((f) => ({
            id: f.id,
            deployed: f.deployed,
            speciesId: f.speciesId,
            level: f.level,
          }))}
          animals={animals?.roster ?? []}
          autoSeedTier={farmers?.autoSeedTier ?? "Basic"}
          hypeBalance={hype}
          workerUpgradeBonus={coverageUpgradeBonus(farmers?.upgrades ?? {})}
        />
      )}
      <WeatherLayer weather={weather} className="z-[5]" />
      {offlineBanner && (
        <div className="absolute left-1/2 top-20 z-40 w-[min(92vw,420px)] -translate-x-1/2 border-[3px] border-[#6b3e1f] bg-[#f6e6c4] px-3 py-2 shadow-[4px_4px_0_#3a2414]">
          <p className="font-[family-name:var(--font-pixel)] text-[10px] leading-relaxed text-[#4a1e0c]">
            {offlineBanner}
          </p>
          <button
            type="button"
            className="mt-2 cursor-pointer border-2 border-[#6b3e1f] bg-[#3dff7a] px-2 py-1 text-[9px] font-bold"
            onClick={() => setOfflineBanner(null)}
          >
            Nice
          </button>
        </div>
      )}
      <StardewTopHud
        farmerName={displayName}
        sp={sp}
        hype={hype}
        seasonLabel={seasonLabel}
        weather={weather}
        activity={farmers?.activity ?? 1}
        hypePerSec={farmers?.hypePerSec ?? 0}
        incomeBreakdown={[
          ...(farmers?.roster ?? [])
            .filter((f) => f.deployed)
            .map((f) => ({
              label: FARMER_SPECIES[f.speciesId]?.name ?? f.speciesId.replace(/_/g, " "),
              rate: farmerHypePerSec(f),
            })),
          ...(animals?.roster ?? []).map((a) => ({
            label: ANIMAL_SPECIES[a.speciesId]?.name ?? a.speciesId,
            rate: ANIMAL_SPECIES[a.speciesId]?.hypePerSec ?? 0,
          })),
        ]}
      />
      {needsName && !displayName ? (
        <FarmerNameGate
          onDone={(name) => {
            setDisplayName(name);
            setNeedsName(false);
          }}
        />
      ) : null}
      <LeftIconColumn
        muted={musicHudMuted}
        onToggleMute={() => {
          // Icon looks muted until first gesture — don't flip preference to muted on that tap.
          if (!musicUnlocked && !musicMuted) return;
          toggleMusicMuted();
        }}
        onShare={() => {
          const url = `${window.location.origin}/play`;
          void navigator.clipboard.writeText(url).then(
            () => toast.success("Farm link copied"),
            () => toast.error("Couldn't copy link — try again"),
          );
        }}
        onMenu={() => setMenuOpen(true)}
      />
      <ShortcutIcons
        onRewards={() => {
          if (tutorialStep === "silo") setTutorialStep("nav");
          setPanel("rewards");
        }}
        onLeaderboard={() => setPanel("ranks")}
      />
      <PoolHudChip
        onOpen={() => {
          if (tutorialStep === "silo") setTutorialStep("nav");
          setPanel("rewards");
        }}
      />
      <QuestTicket
        text="Harvest 3 crops today"
        progress={`${Math.min(3, questHarvest)}/3`}
        claimed={questHarvest >= 3}
      />
      <NpcDialogue tip={npcTip} onDismiss={() => setNpcTip(null)} />
      <BottomNav
        active={nav}
        onSelect={(id) => {
          setNav(id);
          if (id === "silo") {
            if (tutorialStep === "silo") setTutorialStep("nav");
            setPanel("rewards");
          } else if (id === "almanac") setPanel("almanac");
          else if (id === "farmers") setPanel("farmers");
          else if (id === "friends") {
            toast.info("Referrals: copy your farm link with Share.");
          } else if (id === "shop") {
            setPanel("shop");
          }
        }}
      />
      <div className="absolute bottom-24 right-3 z-20 md:right-4">
        <WalletButton />
      </div>

      <PlantPickerSheet
        open={Boolean(plantPlot)}
        level={level}
        hype={hype}
        onClose={() => {
          setPlantPlot(null);
          if (tutorialStep === "pick-seed") setTutorialStep("tap-plot");
        }}
        onPlant={(t) => void onPlant(t)}
      />
      <AlmanacSheet
        open={panel === "almanac"}
        level={level}
        onClose={() => setPanel(null)}
      />
      <CompanionSheet
        open={panel === "companion"}
        level={level}
        activeId={companionId}
        onClose={() => setPanel(null)}
        onAdopt={(id: CompanionId) => {
          setCompanionId(id);
          setPanel(null);
          toast.success("Companion adopted.");
        }}
      />
      <ExpandLandSheet
        open={panel === "expand"}
        level={level}
        gridSize={gridSize}
        hype={hype}
        onClose={() => setPanel(null)}
        onConfirm={() => void onExpand()}
      />
      <HireFarmersSheet
        open={panel === "farmers"}
        hype={hype}
        level={level}
        farmers={farmers}
        onClose={() => setPanel(null)}
        onHireSpecies={(speciesId: FarmerSpeciesId) =>
          void farmerAction("hire-species", undefined, undefined, speciesId)
        }
        onDeploy={(id) => void farmerAction("deploy", id)}
        onBench={(id) => void farmerAction("bench", id)}
        onPromote={(id) => void farmerAction("promote", id)}
        onClaimIdle={() => void farmerAction("claim-idle")}
        onBuyUpgrade={(upgradeId) => void farmerAction("buy-upgrade", undefined, upgradeId)}
        onSetAutoSeed={(tier) =>
          void farmerAction("set-auto-seed", undefined, undefined, undefined, tier)
        }
      />
      <ShopSheet
        open={panel === "shop"}
        hype={hype}
        level={level}
        dailyClaimed={dailyClaimed}
        animals={animals}
        onClose={() => setPanel(null)}
        onClaimDaily={() => void onClaimDaily()}
        onBuyAnimal={(id) => void onBuyAnimal(id)}
        onClaimAnimalIdle={() => void onClaimAnimalIdle()}
      />
      <RewardsSheet open={panel === "rewards"} onClose={() => setPanel(null)} />
      <RanksSheet open={panel === "ranks"} onClose={() => setPanel(null)} />

      {levelUp != null && (
        <LevelUpOverlay level={levelUp} onDone={() => setLevelUp(null)} />
      )}

      {tutorialStep && (
        <TutorialOverlay
          open={tutorialActive || tutorialStep === "done"}
          step={tutorialStep === "done" ? "done" : tutorialStep}
          onSkip={() => void completeTutorialServer()}
          onNext={onTutorialNext}
          onInstantGrow={() => void onTutorialInstantGrow()}
        />
      )}

      <HarvestFlyLayer
        items={flyFx}
        onDone={(id) => setFlyFx((prev) => prev.filter((f) => f.id !== id))}
      />

      {menuOpen && (
        <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/40 p-4 md:items-center">
          <div className="w-full max-w-sm border-[3px] border-[#3a2414] bg-[#c4a06a] p-4 shadow-[6px_6px_0_#1a1008]">
            <p className="font-[family-name:var(--font-pixel)] text-sm text-[#1a1008]">Menu</p>
            <p className="mt-2 text-xs text-[#3a2414]/80">
              Mute, wallet, and docs. Tutorial runs once per wallet.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex flex-col gap-1.5 border-[3px] border-[#3a2414] bg-[#fff8e8] p-2">
                <button
                  type="button"
                  className="flex cursor-pointer items-center justify-between gap-2 px-1 py-1 text-left text-xs font-bold text-[#1a1008]"
                  onClick={toggleMusicMuted}
                  aria-pressed={musicMuted}
                >
                  <span>Music</span>
                  <span className="tabular-nums text-[#3a2414]/70">
                    {musicMuted ? "Off" : "On"}
                  </span>
                </button>
                <button
                  type="button"
                  className="flex cursor-pointer items-center justify-between gap-2 px-1 py-1 text-left text-xs font-bold text-[#1a1008]"
                  onClick={toggleSfxMuted}
                  aria-pressed={sfxMuted}
                >
                  <span>SFX</span>
                  <span className="tabular-nums text-[#3a2414]/70">
                    {sfxMuted ? "Off" : "On"}
                  </span>
                </button>
              </div>
              <button
                type="button"
                className="cursor-pointer border-[3px] border-[#3a2414] bg-[#ffe08a] px-3 py-2 text-left text-xs font-bold text-[#1a1008]"
                onClick={() => {
                  setMenuOpen(false);
                  setTutorialReplay(true);
                  setTutorialPlantId(null);
                  setInstantReadyId(null);
                  try {
                    window.localStorage.removeItem(TUTORIAL_DONE_KEY);
                  } catch {
                    /* ignore */
                  }
                  setTutorialStep("welcome");
                }}
              >
                Replay Tutorial
              </button>
              <button
                type="button"
                className="cursor-pointer border-[3px] border-[#3a2414] bg-[#fff8e8] px-3 py-2 text-left text-xs font-bold text-[#1a1008]"
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/docs");
                }}
              >
                Docs
              </button>
              <button
                type="button"
                className="cursor-pointer text-xs text-[#3a2414]/70 underline"
                onClick={() => setMenuOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      <p className="pointer-events-none absolute bottom-[4.5rem] left-1/2 z-10 w-[min(92vw,28rem)] -translate-x-1/2 text-center text-[8px] leading-snug text-[#1a1008]/45 md:bottom-20">
        {DISCLAIMER}
      </p>

      <p className="sr-only" aria-live="polite">
        Farm level {level}. Tutorial {hasCompletedTutorial ? "done" : "active"}.{" "}
        {plots.filter((p) => p.status === "ready").length} plots ready to harvest.
      </p>
    </div>
  );
}
