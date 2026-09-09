"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TopHud,
  LeftIconColumn,
  BottomNav,
  QuestTicket,
  ShortcutIcons,
  LevelUpOverlay,
} from "@/components/hud/GameHud";
import { PlantPickerSheet } from "@/components/sheets/PlantPickerSheet";
import { AlmanacSheet } from "@/components/sheets/AlmanacSheet";
import { CompanionSheet } from "@/components/sheets/CompanionSheet";
import { ExpandLandSheet } from "@/components/sheets/ExpandLandSheet";
import { DevBypassButton } from "@/components/layout/DevBypassButton";
import { WalletButton } from "@/components/layout/WalletButton";
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
      <div className="flex h-[min(78vh,720px)] items-center justify-center bg-[#87ceeb]/25 text-white/60">
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
  const [panel, setPanel] = useState<"almanac" | "companion" | "expand" | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [burstId, setBurstId] = useState<string | null>(null);
  const [sheetMsg, setSheetMsg] = useState<string | null>(null);

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
      if (data.season) {
        setSeason({
          id: data.season.id,
          number: data.season.number,
          endsAt: data.season.endsAt,
        });
      }
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [jwt, syncFromServer, setSeason, setXp]);

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
      bumpQuest();
      if (data.xpGained) {
        const r = addXp(Number(data.xpGained));
        if (r.leveled) setLevelUp(r.level);
      } else if (data.xp != null) {
        setXp(Number(data.xp));
      }
      await refresh();
      setTimeout(() => setBurstId(null), 800);
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
    setPlantPlot(null);
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
    setPanel(null);
    await refresh();
  };

  if (!jwt || loadError) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <Card className="w-full space-y-4 p-8">
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-white">
            Enter the farm
          </h1>
          <p className="text-sm text-white/55">
            Use Dev play on localhost for the isometric demo — crops mature in ~30s.
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
              <DevBypassButton />
            )}
            <WalletButton />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#6bb86a]/30 pb-4">
      <div className="relative mx-auto w-full max-w-5xl">
        {!loading && (
          <FarmCanvas
            gridSize={gridSize}
            plots={scenePlots}
            siloTier={1}
            barnTier={barnTier}
            onPlotTap={onPlotTap}
            onExpandTap={() => setPanel("expand")}
            onBarnTap={() => setSheetMsg("Barn upgrades unlock with Farm Level.")}
            onSiloTap={() => router.push("/rewards")}
            harvestBurstPlotId={burstId}
          />
        )}
        <TopHud sp={sp} hype={hype} seasonLabel={seasonLabel} />
        <LeftIconColumn
          muted={muted}
          onToggleMute={toggleMuted}
          onShare={() => {
            const url = `${window.location.origin}/play`;
            void navigator.clipboard.writeText(url);
            alert("Farm link copied");
          }}
          onMenu={() => setSheetMsg("Settings: mute, wallet, docs at /docs.")}
        />
        <ShortcutIcons
          onRewards={() => router.push("/rewards")}
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
            else if (id === "companion") setPanel("companion");
            else if (id === "friends") {
              setSheetMsg("Referrals: copy your farm link with Share.");
            } else if (id === "decorate") {
              setSheetMsg("Decor unlocks at Farm Level 20.");
            } else if (id === "shop") {
              setSheetMsg("Shop: tap empty plots to plant seeds.");
            }
          }}
        />
        <div className="absolute bottom-24 right-3 z-20 md:right-4">
          <WalletButton />
        </div>
      </div>

      <PlantPickerSheet
        open={Boolean(plantPlot)}
        level={level}
        hype={hype}
        onClose={() => setPlantPlot(null)}
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

      {levelUp != null && (
        <LevelUpOverlay level={levelUp} onDone={() => setLevelUp(null)} />
      )}

      {sheetMsg && (
        <div className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-black/80 px-4 py-2 text-xs text-white">
          {sheetMsg}
          <button type="button" className="ml-2 text-[#3DFF7A]" onClick={() => setSheetMsg(null)}>
            OK
          </button>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        Farm level {level}. {plots.filter((p) => p.status === "ready").length} plots ready to
        harvest. {plots.filter((p) => p.status === "empty").length} empty plots.
      </p>
    </div>
  );
}
