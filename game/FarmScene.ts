import Phaser from "phaser";
import { TILE_HEIGHT, TILE_WIDTH, grassVariant, isoDepth, isoToScreen } from "@/game/iso";
import { blueprintBounds, groundAt, propAt, type GroundCell } from "@/game/farmLayout";
import { barnTextureKey } from "@/lib/game/barnVisual";

export type ScenePlot = {
  id: string;
  index: number;
  gridX: number;
  gridY: number;
  seedTier: string | null;
  plantedAt: string | null;
  maturesAt: string | null;
  status: string;
};

export type FarmSceneConfig = {
  gridSize: number;
  plots: ScenePlot[];
  farmLevel: number;
  barnTier: 1 | 2 | 3;
  siloTier: 1 | 2 | 3;
  onPlotTap: (plot: ScenePlot) => void;
  onExpandTap: () => void;
  onBarnTap: () => void;
  onSiloTap: () => void;
  /** Highlight plot for tutorial spotlight (world grid). */
  highlightPlot?: { gridX: number; gridY: number } | null;
  tutorialInstantReadyPlotId?: string | null;
  /** When remounting after land expand, play dust/pan once. */
  expandPulse?: number;
};

const REQUIRED = [
  "tile_grass",
  "tile_grass_b",
  "tile_soil",
  "tile_path",
  "tile_water",
  "tile_locked",
  "tile_dirt",
  "building_barn_l1",
  "building_barn_l5",
  "building_barn_l10",
  "building_barn_l15",
  "building_barn_l20",
  "building_silo",
  "prop_fence",
  "prop_hay",
  "prop_crate",
  "prop_sign",
  "prop_pet",
  "prop_sparkle",
] as const;

function growthStage(plot: ScenePlot, now: number): number {
  if (!plot.plantedAt || !plot.maturesAt || plot.status === "empty") return -1;
  if (plot.status === "blighted") return 4;
  if (plot.status === "ready") return 3;
  const start = new Date(plot.plantedAt).getTime();
  const end = new Date(plot.maturesAt).getTime();
  const p = Math.min(1, Math.max(0, (now - start) / Math.max(1, end - start)));
  if (p < 0.25) return 0;
  if (p < 0.5) return 1;
  if (p < 0.85) return 2;
  return 3;
}

function tierKey(seedTier: string | null): string {
  const t = (seedTier ?? "Basic").toLowerCase();
  if (t.includes("mythic") || t.includes("diamond")) return "mythic";
  if (t.includes("golden")) return "golden";
  if (t.includes("hybrid")) return "hybrid";
  return "basic";
}

function assertTileKey(key: string) {
  if (!key.startsWith("tile_")) {
    throw new Error(`[FarmScene] Ground refused non-tile key "${key}"`);
  }
}

export class FarmScene extends Phaser.Scene {
  private cfg!: FarmSceneConfig;
  private plotSprites = new Map<string, Phaser.GameObjects.Container>();
  private cropSprites = new Map<string, Phaser.GameObjects.Image>();
  private originX = 0;
  private originY = 0;
  private loadFailed: string[] = [];
  private bootBlocked = false;
  private barnSprite?: Phaser.GameObjects.Image;
  private highlightGfx?: Phaser.GameObjects.Graphics;
  private dustEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super("FarmScene");
  }

  init(data: FarmSceneConfig) {
    this.cfg = data;
    this.loadFailed = [];
    this.bootBlocked = false;
  }

  preload() {
    const t = "/assets/sprites/tiles";
    const b = "/assets/sprites/buildings";
    const p = "/assets/sprites/props";
    const c = "/assets/sprites/crops";
    const companions = "/assets/sprites/companions";
    const ui = "/assets/sprites/ui";

    this.load.on("loaderror", (file: { key?: string }) => {
      this.loadFailed.push(String(file?.key ?? "unknown"));
    });

    this.load.image("tile_grass", `${t}/tile_grass.png`);
    this.load.image("tile_grass_b", `${t}/tile_grass_b.png`);
    this.load.image("tile_soil", `${t}/tile_soil.png`);
    this.load.image("tile_path", `${t}/tile_path.png`);
    this.load.image("tile_water", `${t}/tile_water.png`);
    this.load.image("tile_locked", `${t}/tile_locked.png`);
    this.load.image("tile_dirt", `${t}/tile_dirt.png`);

    this.load.image("building_barn_l1", `${b}/barn_l1.png`);
    this.load.image("building_barn_l5", `${b}/barn_l5.png`);
    this.load.image("building_barn_l10", `${b}/barn_l10.png`);
    this.load.image("building_barn_l15", `${b}/barn_l15.png`);
    this.load.image("building_barn_l20", `${b}/barn_l20.png`);
    this.load.image("building_silo", `${b}/silo.png`);

    this.load.image("prop_fence", `${p}/fence.png`);
    this.load.image("prop_hay", `${p}/hay.png`);
    this.load.image("prop_crate", `${p}/crate.png`);
    this.load.image("prop_sign", `${p}/sign.png`);
    this.load.image("prop_pet", `${companions}/pet.png`);
    this.load.image("prop_sparkle", `${ui}/sparkle.png`);

    for (const tier of ["basic", "hybrid", "golden", "mythic"] as const) {
      for (let s = 0; s < 4; s++) this.load.image(`crop_${tier}_${s}`, `${c}/${tier}_${s}.png`);
      this.load.image(`crop_${tier}_blight`, `${c}/${tier}_blight.png`);
    }
  }

  create() {
    this.originX = this.scale.width / 2;
    this.originY = this.scale.height * 0.22;
    this.cameras.main.setBackgroundColor("#87b8d8");
    this.cameras.main.setZoom(0.42);

    const missing = [
      ...this.loadFailed,
      ...REQUIRED.filter((k) => !this.textures.exists(k)),
    ];
    if (missing.length) {
      this.bootBlocked = true;
      this.showError([...new Set(missing)]);
      return;
    }

    this.buildWorld();
    this.highlightGfx = this.add.graphics().setDepth(9998);
    this.refreshHighlight();

    if (this.cfg.expandPulse) {
      this.time.delayedCall(350, () => this.playExpandReveal());
    }
  }

  private showError(keys: string[]) {
    this.cameras.main.setZoom(1);
    this.add
      .rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x1a0a2e, 0.95)
      .setDepth(10000);
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, `Missing textures:\n${keys.join("\n")}`, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#ff6b9d",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(10001);
  }

  private tileKey(cell: GroundCell, gx: number, gy: number) {
    let key: string;
    switch (cell) {
      case "S":
        key = "tile_soil";
        break;
      case "P":
        key = "tile_path";
        break;
      case "W":
        key = "tile_water";
        break;
      case "L":
        key = "tile_locked";
        break;
      case "B":
        key = "tile_dirt";
        break;
      default:
        key = grassVariant(gx, gy) === "a" ? "tile_grass" : "tile_grass_b";
    }
    assertTileKey(key);
    return key;
  }

  private tilePos(gx: number, gy: number) {
    const p = isoToScreen(gx, gy);
    return { x: this.originX + p.x, y: this.originY + p.y };
  }

  private placeSprite(key: string, gx: number, gy: number, layer: number, scale = 1) {
    const { x, y } = this.tilePos(gx, gy);
    return this.add
      .image(x, y, key)
      .setOrigin(0.5, 1)
      .setScale(scale)
      .setDepth(isoDepth(gx, gy, layer));
  }

  private buildWorld() {
    const bounds = blueprintBounds();
    const pad = 1;
    for (let gy = bounds.minY - pad; gy <= bounds.maxY + pad; gy++) {
      for (let gx = bounds.minX - pad; gx <= bounds.maxX + pad; gx++) {
        const cell = groundAt(gx, gy);
        this.placeSprite(this.tileKey(cell, gx, gy), gx, gy, 0);
      }
    }

    for (let gy = bounds.minY; gy <= bounds.maxY; gy++) {
      for (let gx = bounds.minX; gx <= bounds.maxX; gx++) {
        const prop = propAt(gx, gy);
        if (prop === "F") this.placeSprite("prop_fence", gx, gy, 3, 0.9);
        else if (prop === "H") this.placeSprite("prop_hay", gx, gy, 3, 0.9);
        else if (prop === "K") this.placeSprite("prop_crate", gx, gy, 3, 0.85);
        else if (prop === "E") {
          const sign = this.placeSprite("prop_sign", gx, gy, 4, 0.9).setInteractive({
            useHandCursor: true,
          });
          this.tweens.add({ targets: sign, y: sign.y - 6, duration: 800, yoyo: true, repeat: -1 });
          sign.on("pointerdown", () => this.cfg.onExpandTap());
        } else if (prop === "C") {
          const pet = this.placeSprite("prop_pet", gx, gy, 3, 0.55);
          if (pet.displayWidth > TILE_WIDTH * 0.7) pet.setScale(0.45);
          this.tweens.add({
            targets: pet,
            x: pet.x + 40,
            duration: 3500,
            yoyo: true,
            repeat: -1,
            onUpdate: () => pet.setDepth(isoDepth(gx, gy, 3)),
          });
        }
      }
    }

    const barnKey = barnTextureKey(this.cfg.farmLevel);
    this.barnSprite = this.placeSprite(barnKey, 1, -2, 4, 1)
      .setInteractive({ useHandCursor: true });
    this.barnSprite.on("pointerdown", () => this.cfg.onBarnTap());

    const silo = this.placeSprite("building_silo", 5, -1, 4, 0.95).setInteractive({
      useHandCursor: true,
    });
    silo.on("pointerdown", () => this.cfg.onSiloTap());

    for (const plot of this.cfg.plots) {
      if (groundAt(plot.gridX, plot.gridY) !== "S" && plot.gridX < 3) {
        // still allow claimed farm soil even if blueprint only has S at 0..2
      }
      const { x, y } = this.tilePos(plot.gridX, plot.gridY);
      // Ensure soil under plot
      this.placeSprite("tile_soil", plot.gridX, plot.gridY, 0);
      const hit = this.add
        .zone(x, y - TILE_HEIGHT * 0.35, TILE_WIDTH * 0.55, TILE_HEIGHT * 0.55)
        .setInteractive({ useHandCursor: true })
        .setDepth(isoDepth(plot.gridX, plot.gridY, 6));
      hit.on("pointerdown", () => {
        const fresh = this.cfg.plots.find((p) => p.id === plot.id);
        if (fresh) this.cfg.onPlotTap(fresh);
      });
      this.plotSprites.set(
        plot.id,
        this.add.container(x, y).setDepth(isoDepth(plot.gridX, plot.gridY, 2)),
      );
      this.refreshCrop(plot);
    }

    this.cameras.main.centerOn(this.originX, this.originY + 80);

    this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        if (!this.bootBlocked) for (const p of this.cfg.plots) this.refreshCrop(p);
      },
    });
  }

  updatePlots(plots: ScenePlot[]) {
    if (this.bootBlocked) return;
    this.cfg.plots = plots;
    for (const p of plots) this.refreshCrop(p);
  }

  setFarmLevel(level: number) {
    this.cfg.farmLevel = level;
    if (!this.barnSprite) return;
    const key = barnTextureKey(level);
    if (this.textures.exists(key) && this.barnSprite.texture.key !== key) {
      this.barnSprite.setTexture(key);
      this.tweens.add({
        targets: this.barnSprite,
        scaleX: this.barnSprite.scaleX * 1.08,
        scaleY: this.barnSprite.scaleY * 1.08,
        yoyo: true,
        duration: 220,
      });
    }
  }

  setHighlightPlot(plot: { gridX: number; gridY: number } | null) {
    this.cfg.highlightPlot = plot;
    this.refreshHighlight();
  }

  setTutorialInstantReady(plotId: string | null) {
    this.cfg.tutorialInstantReadyPlotId = plotId;
    for (const p of this.cfg.plots) this.refreshCrop(p);
  }

  private refreshHighlight() {
    if (!this.highlightGfx) return;
    this.highlightGfx.clear();
    const h = this.cfg.highlightPlot;
    if (!h) return;
    const { x, y } = this.tilePos(h.gridX, h.gridY);
    this.highlightGfx.lineStyle(4, 0x3dff7a, 0.95);
    this.highlightGfx.strokeEllipse(x, y - 20, TILE_WIDTH * 0.7, TILE_HEIGHT * 0.7);
  }

  playExpandReveal() {
    const { x, y } = this.tilePos(this.cfg.gridSize, Math.floor(this.cfg.gridSize / 2));
    this.cameras.main.pan(x, y, 700, "Sine.easeInOut");
    const parts = this.add.particles(x, y, "prop_sparkle", {
      speed: { min: 40, max: 160 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      lifespan: 900,
      quantity: 24,
      emitting: false,
      tint: [0xc4a574, 0xffffff, 0x3dff7a],
    });
    parts.setDepth(9990);
    parts.explode(28);
    this.time.delayedCall(1000, () => parts.destroy());
  }

  playHarvestBurst(plotId: string) {
    const crop = this.cropSprites.get(plotId);
    if (!crop) return;
    const parts = this.add.particles(crop.x, crop.y - 40, "prop_sparkle", {
      speed: { min: 60, max: 180 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.5, end: 0 },
      lifespan: 700,
      quantity: 14,
      emitting: false,
      tint: [0x3dff7a, 0xffc94d],
    });
    parts.setDepth(crop.depth + 5);
    parts.explode(16);
    this.tweens.add({
      targets: crop,
      alpha: 0,
      scale: crop.scale * 1.2,
      duration: 200,
      onComplete: () => crop.destroy(),
    });
    this.time.delayedCall(800, () => parts.destroy());
  }

  private refreshCrop(plot: ScenePlot) {
    // Tutorial instant-ready override
    const forceReady = this.cfg.tutorialInstantReadyPlotId === plot.id;
    const stage = forceReady ? 3 : growthStage(plot, Date.now());
    const container = this.plotSprites.get(plot.id);
    if (!container) return;
    let existing = this.cropSprites.get(plot.id);

    if (stage < 0) {
      existing?.destroy();
      this.cropSprites.delete(plot.id);
      return;
    }

    const key =
      !forceReady && plot.status === "blighted"
        ? `crop_${tierKey(plot.seedTier)}_blight`
        : `crop_${tierKey(plot.seedTier)}_${Math.min(3, stage)}`;

    if (!existing) {
      existing = this.add
        .image(container.x, container.y, key)
        .setOrigin(0.5, 1)
        .setDepth(isoDepth(plot.gridX, plot.gridY, 2));
      this.cropSprites.set(plot.id, existing);
      existing.setScale(0);
      this.tweens.add({ targets: existing, scale: 1, duration: 240, ease: "Back.easeOut" });
    } else if (existing.texture.key !== key) {
      existing.setTexture(key);
    }

    if ((forceReady || plot.status === "ready") && !existing.getData("glow")) {
      existing.setData("glow", true);
      this.tweens.add({ targets: existing, alpha: 0.78, duration: 420, yoyo: true, repeat: -1 });
    }
  }
}
