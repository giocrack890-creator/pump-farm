"use client";

import { useEffect, useRef } from "react";
import type { FarmScene, FarmSceneConfig, ScenePlot } from "./FarmScene";

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
  harvestBurstPlotId?: string | null;
  highlightPlot?: { gridX: number; gridY: number } | null;
  tutorialInstantReadyPlotId?: string | null;
  expandPulse?: number;
  decor?: { id: string; itemId: string; gridX: number; gridY: number }[];
};

export function FarmCanvas(props: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<FarmScene | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

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
        highlightPlot: propsRef.current.highlightPlot,
        tutorialInstantReadyPlotId: propsRef.current.tutorialInstantReadyPlotId,
        expandPulse: propsRef.current.expandPulse,
        decor: propsRef.current.decor,
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
        backgroundColor: "#87ceeb",
        scene: [scene],
        pixelArt: true,
        antialias: false,
        roundPixels: true,
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        input: { activePointers: 2 },
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
    if (props.harvestBurstPlotId) sceneRef.current?.playHarvestBurst(props.harvestBurstPlotId);
  }, [props.harvestBurstPlotId]);

  useEffect(() => {
    if (props.expandPulse) sceneRef.current?.playExpandReveal();
  }, [props.expandPulse]);

  useEffect(() => {
    sceneRef.current?.setTutorialInstantReady(props.tutorialInstantReadyPlotId ?? null);
  }, [props.tutorialInstantReadyPlotId]);

  useEffect(() => {
    sceneRef.current?.syncDecor(props.decor ?? []);
  }, [props.decor]);

  return <div ref={hostRef} className="absolute inset-0 h-dvh w-screen overflow-hidden" />;
}
