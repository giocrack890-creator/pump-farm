"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { FarmScene, FarmSceneConfig, ScenePlot, SceneWorker } from "./FarmScene";
import type { OwnedAnimal } from "@/lib/game/animals";
import type { SeedTierId } from "@/lib/game/seeds";

type Props = {
  gridSize: number;
  plots: ScenePlot[];
  farmLevel: number;
  barnTier?: 1 | 2 | 3;
  siloTier?: 1 | 2 | 3;
  onPlotTap: (plot: ScenePlot) => void;
  onExpandTap: () => void;
  onBarnTap: () => void;
  onSiloTap: () => void;
  onNpcTap?: (npc: "foreman" | "pierre" | "chick") => void;
  onWorkerHarvest?: (plot: ScenePlot, workerId: string) => void;
  onWorkerPlant?: (plot: ScenePlot, workerId: string, seedTier: SeedTierId) => void;
  harvestBurstPlotId?: string | null;
  harvestCombo?: number;
  highlightPlot?: { gridX: number; gridY: number } | null;
  tutorialInstantReadyPlotId?: string | null;
  expandPulse?: number;
  decor?: { id: string; itemId: string; gridX: number; gridY: number }[];
  workers?: SceneWorker[];
  animals?: OwnedAnimal[];
  autoSeedTier?: SeedTierId;
  hypeBalance?: number;
  workerUpgradeBonus?: number;
  onReady?: (handle: FarmCanvasHandle) => void;
};

export type FarmCanvasHandle = {
  getPlotScreenPoint: (plotId: string) => { x: number; y: number } | null;
};

export const FarmCanvas = forwardRef<FarmCanvasHandle, Props>(function FarmCanvas(props, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<FarmScene | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useImperativeHandle(ref, () => ({
    getPlotScreenPoint: (plotId: string) =>
      sceneRef.current?.getPlotScreenPoint(plotId) ?? null,
  }));

  useEffect(() => {
    props.onReady?.({
      getPlotScreenPoint: (plotId: string) =>
        sceneRef.current?.getPlotScreenPoint(plotId) ?? null,
    });
  }, [props.onReady, props.gridSize]);

  useEffect(() => {
    let destroyed = false;
    const boot = async () => {
      const Phaser = (await import("phaser")).default;
      const { FarmScene: Scene } = await import("./FarmScene");
      if (destroyed || !hostRef.current) return;
      gameRef.current?.destroy(true);
      hostRef.current.replaceChildren();

      const cfg: FarmSceneConfig = {
        gridSize: propsRef.current.gridSize,
        plots: propsRef.current.plots,
        farmLevel: propsRef.current.farmLevel,
        barnTier: propsRef.current.barnTier ?? 1,
        siloTier: propsRef.current.siloTier ?? 1,
        onPlotTap: (p) => propsRef.current.onPlotTap(p),
        onExpandTap: () => propsRef.current.onExpandTap(),
        onBarnTap: () => propsRef.current.onBarnTap(),
        onSiloTap: () => propsRef.current.onSiloTap(),
        onNpcTap: (npc) => propsRef.current.onNpcTap?.(npc),
        onWorkerHarvest: (p, id) => propsRef.current.onWorkerHarvest?.(p, id),
        onWorkerPlant: (p, id, tier) => propsRef.current.onWorkerPlant?.(p, id, tier),
        highlightPlot: propsRef.current.highlightPlot,
        tutorialInstantReadyPlotId: propsRef.current.tutorialInstantReadyPlotId,
        expandPulse: propsRef.current.expandPulse,
        decor: propsRef.current.decor,
        workers: propsRef.current.workers,
        animals: propsRef.current.animals,
        autoSeedTier: propsRef.current.autoSeedTier,
        hypeBalance: propsRef.current.hypeBalance,
        workerUpgradeBonus: propsRef.current.workerUpgradeBonus,
      };

      const scene = new Scene();
      sceneRef.current = scene;
      const w = hostRef.current.clientWidth || window.innerWidth;
      const h = hostRef.current.clientHeight || window.innerHeight;
      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: w,
        height: h,
        backgroundColor: "#92c868",
        scene: [scene],
        pixelArt: true,
        antialias: false,
        roundPixels: true,
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        input: { activePointers: 3 },
        audio: { noAudio: true },
      });
      gameRef.current = game;
      game.scene.start("FarmScene", cfg);
    };
    void boot();
    return () => {
      destroyed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, [props.gridSize]);

  useEffect(() => {
    sceneRef.current?.updatePlots(props.plots);
  }, [props.plots]);

  useEffect(() => {
    sceneRef.current?.setFarmLevel(props.farmLevel);
  }, [props.farmLevel]);

  useEffect(() => {
    sceneRef.current?.setHighlightPlot(props.highlightPlot ?? null);
  }, [props.highlightPlot]);

  useEffect(() => {
    if (props.harvestBurstPlotId) {
      sceneRef.current?.playHarvestBurst(props.harvestBurstPlotId, {
        combo: props.harvestCombo ?? 1,
      });
    }
  }, [props.harvestBurstPlotId, props.harvestCombo]);

  useEffect(() => {
    if (props.expandPulse) sceneRef.current?.playExpandReveal();
  }, [props.expandPulse]);

  useEffect(() => {
    sceneRef.current?.setTutorialInstantReady(props.tutorialInstantReadyPlotId ?? null);
  }, [props.tutorialInstantReadyPlotId]);

  useEffect(() => {
    sceneRef.current?.syncDecor(props.decor ?? []);
  }, [props.decor]);

  useEffect(() => {
    sceneRef.current?.syncWorkers(props.workers ?? []);
  }, [props.workers]);

  useEffect(() => {
    sceneRef.current?.syncAnimals(props.animals ?? []);
  }, [props.animals]);

  useEffect(() => {
    sceneRef.current?.syncAutoFarmEconomy({
      autoSeedTier: props.autoSeedTier,
      hypeBalance: props.hypeBalance,
      workerUpgradeBonus: props.workerUpgradeBonus,
    });
  }, [props.autoSeedTier, props.hypeBalance, props.workerUpgradeBonus]);

  return <div ref={hostRef} className="absolute inset-0 h-dvh w-screen overflow-hidden" />;
});
