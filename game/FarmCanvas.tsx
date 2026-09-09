"use client";

import { useEffect, useRef } from "react";
import type { FarmSceneConfig, ScenePlot } from "./FarmScene";

type Props = {
  gridSize: number;
  plots: ScenePlot[];
  barnTier?: 1 | 2 | 3;
  siloTier?: 1 | 2 | 3;
  onPlotTap: (plot: ScenePlot) => void;
  onExpandTap: () => void;
  onBarnTap: () => void;
  onSiloTap: () => void;
  harvestBurstPlotId?: string | null;
};

export function FarmCanvas(props: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<import("./FarmScene").FarmScene | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    let destroyed = false;

    const boot = async () => {
      const Phaser = (await import("phaser")).default;
      const { FarmScene } = await import("./FarmScene");
      if (destroyed || !hostRef.current) return;

      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
      hostRef.current.replaceChildren();

      const cfg: FarmSceneConfig = {
        gridSize: propsRef.current.gridSize,
        plots: propsRef.current.plots,
        barnTier: propsRef.current.barnTier ?? 1,
        siloTier: propsRef.current.siloTier ?? 1,
        onPlotTap: (p) => propsRef.current.onPlotTap(p),
        onExpandTap: () => propsRef.current.onExpandTap(),
        onBarnTap: () => propsRef.current.onBarnTap(),
        onSiloTap: () => propsRef.current.onSiloTap(),
      };

      const scene = new FarmScene();
      sceneRef.current = scene;

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: hostRef.current.clientWidth || 900,
        height: Math.max(520, Math.floor((hostRef.current.clientWidth || 900) * 0.72)),
        backgroundColor: "#8ec8e8",
        transparent: false,
        scene: [scene],
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
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
    if (props.harvestBurstPlotId) {
      sceneRef.current?.playHarvestBurst(props.harvestBurstPlotId);
    }
  }, [props.harvestBurstPlotId]);

  return (
    <div
      ref={hostRef}
      className="relative h-[min(78vh,720px)] w-full overflow-hidden rounded-none border-0 shadow-none md:rounded-[28px] md:border md:border-white/10 md:shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
      role="img"
      aria-label="Isometric Pump Farm scene. Use the plant sheet and HUD to interact."
    />
  );
}
