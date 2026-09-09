"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LeftIconColumn,
  BottomNav,
  QuestTicket,
  ShortcutIcons,
  LevelUpOverlay,
} from "@/components/hud/GameHud";
import { StardewTopHud } from "@/components/hud/StardewTopHud";
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
import { DevBypassButton } from "@/components/layout/DevBypassButton";
import { WalletButton } from "@/components/layout/WalletButton";
import { DISCLAIMER } from "@/components/layout/Footer";
import { useFarmStore } from "@/store/useFarmStore";
import { useWalletStore } from "@/store/useWalletStore";
import { useSeasonStore } from "@/store/useSeasonStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useSoundStore, sounds } from "@/store/useSoundStore";
import type { SeedTierId } from "@/lib/game/seeds";
import type { CompanionId } from "@/lib/game/companions";
import type { ScenePlot } from "@/game/FarmScene";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const FarmCanvas = dynamic(
  () => import("@/game/FarmCanvas").then((m) => m.FarmCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-dvh items-center justify-center bg-[#87b8d8] text-[#1a1008]/70">
        Loading farm scene…
      </div>
    ),
  },
);

export default function PlayPage() {
  const router = useRouter();
  const jwt = useWalletStore((s) => s.jwt);
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
  const muted = useSoundStore((s) => s.muted);
  const toggleMuted = useSoundStore((s) => s.toggleMuted);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [plantPlot, setPlantPlot] = useState<ScenePlot | null>(null);
  const [nav, setNav] = useState("shop");
  const [panel, setPanel] = useState<
    "almanac" | "companion" | "expand" | "farmers" | null
  >(null);
  const [farmers, setFarmers] = useState<FarmersPanelState | null>(null);
  const [weather, setWeather] = useState("Sunny");
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [burstId, setBurstId] = useState<string | null>(null);
  const [sheetMsg, setSheetMsg] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(true);
  const [tutorialStep, setTutorialStep] = useState<TutorialStepId | null>(null);
  const [tutorialReplay, setTutorialReplay] = useState(false);
  const [tutorialPlantId, setTutorialPlantId] = useState<string | null>(null);
  const [instantReadyId, setInstantReadyId] = useState<string | null>(null);
  const [expandPulse, setExpandPulse] = useState(0);

  const scenePlots: ScenePlot[] = useMemo(
    () =>
      plots.map((p, i) => ({
        id: p.id,
        index: p.index,
        gridX: p.gridX ?? i % gridSize,
        gridY: p.gridY ?? Math.floor(i / gridSize),
        seedTier: p.seedTier,
        plantedAt: p.plantedAt,
        maturesAt: p.maturesAt,
        status: p.status,
      })),
    [plots, gridSize],
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
    setHasCompletedTutorial(true);
    setTutorialReplay(false);
    setTutorialStep(null);
    setInstantReadyId(null);
    setTutorialPlantId(null);
  }, [jwt]);

  const refresh = useCallback(async () => {
    if (!jwt) {
      setLoading(false);
      setLoadError(true);
      return;
    }
    try {
      const res = await fetch("/api/farm", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) {
        setLoadError(true);
        return;
      }
      const data = await res.json();
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
      if (data.farmers) setFarmers(data.farmers as FarmersPanelState);
      if (data.weather) setWeather(String(data.weather));
      if (data.season) {
        setSeason({
          id: data.season.id,
          number: data.season.number,
          endsAt: data.season.endsAt,
        });
      }
      const done = Boolean(data.wallet?.hasCompletedTutorial);
      setHasCompletedTutorial(done);
      if (!done && !tutorialReplay) {
        setTutorialStep((prev) => prev ?? "welcome");
      }
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [jwt, syncFromServer, setSeason, setXp, tutorialReplay]);

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
      if (!jwt) return;
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
        alert(data.error ?? "Harvest failed");
        return;
      }
      sounds.harvest();
      setBurstId(plot.id);
      setInstantReadyId(null);
      bumpQuest();
      if (data.xpGained) {
        const r = addXp(Number(data.xpGained));
        if (r.leveled) setLevelUp(r.level);
      } else if (data.xp != null) {
        setXp(Number(data.xp));
      }
      await refresh();
      setTimeout(() => setBurstId(null), 800);
      if (tutorialStep === "harvest") setTutorialStep("xp");
    }
  };

  const onPlant = async (tier: SeedTierId) => {
    if (!jwt || !plantPlot) return;
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
      alert(data.error ?? "Plant failed");
      return;
    }
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
      alert(data.error ?? "Instant grow failed");
      return;
    }
    setInstantReadyId(tutorialPlantId);
    await refresh();
    setTutorialStep("harvest");
  };

  const farmerAction = async (action: string, farmerId?: string) => {
    if (!jwt) return;
    const res = await fetch("/api/farm/farmers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, farmerId }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Action failed");
      return;
    }
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
      alert(data.error ?? "Expand failed");
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

  if (!jwt || loadError) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <Card className="w-full space-y-4 border-[4px] border-[#6b3e1f] bg-[#e8c48a] p-8 shadow-[4px_4px_0_#3a2414]">
          <h1 className="font-[family-name:var(--font-pixel)] text-lg text-[#4a1e0c]">
            Enter the farm
          </h1>
          <p className="text-sm text-[#6b3e1f]">
            Tap Play demo to jump straight into the isometric farm — no wallet needed for the public
            demo.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {loadError && jwt ? (
              <Button
                variant="gold"
                onClick={() => {
                  useWalletStore.getState().clearAuth();
                  setLoadError(false);
                }}
              >
                Clear session
              </Button>
            ) : (
              <DevBypassButton auto={!jwt && !loadError} />
            )}
            <WalletButton />
          </div>
        </Card>
        <p className="mt-6 max-w-md text-[10px] leading-relaxed text-[#4a1e0c]/50">{DISCLAIMER}</p>
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-[#87b8d8]">
      {!loading && (
        <FarmCanvas
          gridSize={gridSize}
          plots={scenePlots}
          farmLevel={level}
          siloTier={1}
          barnTier={barnTier}
          onPlotTap={onPlotTap}
          onExpandTap={() => setPanel("expand")}
          onBarnTap={() =>
            setSheetMsg(`Exchange look tracks Farm Level (visual L${level}).`)
          }
          onSiloTap={() => router.push("/rewards")}
          harvestBurstPlotId={burstId}
          highlightPlot={highlightPlot}
          tutorialInstantReadyPlotId={instantReadyId}
          expandPulse={expandPulse}
        />
      )}
      <StardewTopHud
        sp={sp}
        hype={hype}
        seasonLabel={seasonLabel}
        weather={weather}
        activity={farmers?.activity ?? 1}
        hypePerSec={farmers?.hypePerSec ?? 0}
      />
      <LeftIconColumn
        muted={muted}
        onToggleMute={toggleMuted}
        onShare={() => {
          const url = `${window.location.origin}/play`;
          void navigator.clipboard.writeText(url);
          alert("Farm link copied");
        }}
        onMenu={() => setMenuOpen(true)}
      />
      <ShortcutIcons
        onRewards={() => {
          if (tutorialStep === "silo") setTutorialStep("nav");
          router.push("/rewards");
        }}
        onLeaderboard={() => router.push("/leaderboard")}
      />
      <QuestTicket
        text="Harvest 3 crops today"
        progress={`${Math.min(3, questHarvest)}/3`}
      />
      <BottomNav
        active={nav}
        onSelect={(id) => {
          setNav(id);
          if (id === "silo") router.push("/rewards");
          else if (id === "almanac") setPanel("almanac");
          else if (id === "farmers") setPanel("farmers");
          else if (id === "friends") {
            setSheetMsg("Referrals: copy your farm link with Share.");
          } else if (id === "decorate") {
            setSheetMsg("Decor unlocks at Farm Level 20. Pets: open Hire for farmers.");
          } else if (id === "shop") {
            setSheetMsg("Shop: tap empty plots to plant seeds. Hire tab = farmers.");
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
          setSheetMsg(`Adopted companion.`);
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
        farmers={farmers}
        onClose={() => setPanel(null)}
        onScout={() => void farmerAction("scout")}
        onHire={() => void farmerAction("hire")}
        onDismissScout={() => void farmerAction("dismiss-scout")}
        onDeploy={(id) => void farmerAction("deploy", id)}
        onBench={(id) => void farmerAction("bench", id)}
        onPromote={(id) => void farmerAction("promote", id)}
        onClaimIdle={() => void farmerAction("claim-idle")}
      />

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

      {menuOpen && (
        <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/40 p-4 md:items-center">
          <div className="w-full max-w-sm border-[3px] border-[#3a2414] bg-[#c4a06a] p-4 shadow-[6px_6px_0_#1a1008]">
            <p className="font-[family-name:var(--font-pixel)] text-sm text-[#1a1008]">Menu</p>
            <p className="mt-2 text-xs text-[#3a2414]/80">
              Mute, wallet, and docs. Tutorial runs once per wallet.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                className="cursor-pointer border-[3px] border-[#3a2414] bg-[#ffe08a] px-3 py-2 text-left text-xs font-bold text-[#1a1008]"
                onClick={() => {
                  setMenuOpen(false);
                  setTutorialReplay(true);
                  setTutorialPlantId(null);
                  setInstantReadyId(null);
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

      {sheetMsg && (
        <div className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-black/80 px-4 py-2 text-xs text-white">
          {sheetMsg}
          <button type="button" className="ml-2 text-[#3DFF7A]" onClick={() => setSheetMsg(null)}>
            OK
          </button>
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
