import Phaser from "phaser";
import { TILE_SCREEN, depthFromY, gridToScreen } from "@/game/tile";
import { groundAt, mapBounds, type GroundCell } from "@/game/farmLayout";
import { barnVisualFromLevel } from "@/lib/game/barnVisual";

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
  highlightPlot?: { gridX: number; gridY: number } | null;
  tutorialInstantReadyPlotId?: string | null;
  expandPulse?: number;
  decor?: { id: string; itemId: string; gridX: number; gridY: number }[];
};

const REQUIRED = [
  "tile_grass",
  "tile_soil",
  "tile_path",
  "tile_water",
  "tile_locked",
  "tile_dirt",
  "building_barn",
  "building_silo",
  "prop_fence",
  "prop_hay",
  "prop_crate",
  "prop_sign",
  "prop_tree",
  "prop_sparkle",
  "crop_0",
  "crop_1",
  "crop_2",
  "crop_3",
  "crop_ready",
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

function fillRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
) {
  g.fillStyle(color, 1);
  g.fillRect(x, y, w, h);
}

/** Bake Stardew-like 16×16 pixel textures (no external iso pack). */
function bakePixelTextures(scene: Phaser.Scene) {
  const s = 16;

  const make = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void) => {
    const g = scene.make.graphics({ x: 0, y: 0 });
    draw(g);
    g.generateTexture(key, s, s);
    g.destroy();
  };

  make("tile_grass", (g) => {
    fillRect(g, 0, 0, s, s, 0x5dbb63);
    fillRect(g, 2, 3, 2, 2, 0x3d9a4a);
    fillRect(g, 9, 8, 2, 2, 0x7ad87f);
    fillRect(g, 5, 12, 2, 2, 0x3d9a4a);
  });
  make("tile_soil", (g) => {
    fillRect(g, 0, 0, s, s, 0x8b5a2b);
    fillRect(g, 1, 1, 14, 14, 0xa06a35);
    fillRect(g, 3, 4, 2, 2, 0x6e4420);
    fillRect(g, 10, 9, 2, 2, 0x6e4420);
  });
  make("tile_path", (g) => {
    fillRect(g, 0, 0, s, s, 0xc4a06a);
    fillRect(g, 1, 1, 14, 14, 0xd4b07a);
    fillRect(g, 4, 6, 2, 2, 0xb08950);
    fillRect(g, 11, 3, 2, 2, 0xb08950);
  });
  make("tile_water", (g) => {
    fillRect(g, 0, 0, s, s, 0x3a7ca5);
    fillRect(g, 2, 4, 4, 2, 0x5eb1d4);
    fillRect(g, 9, 10, 5, 2, 0x5eb1d4);
  });
  make("tile_locked", (g) => {
    fillRect(g, 0, 0, s, s, 0x4a5560);
    fillRect(g, 2, 2, 12, 12, 0x5a6570);
    fillRect(g, 6, 6, 4, 4, 0x2d343c);
  });
  make("tile_dirt", (g) => {
    fillRect(g, 0, 0, s, s, 0x6b4423);
    fillRect(g, 2, 2, 12, 12, 0x7a5230);
  });

  // Crops — tiny green stalks → golden candle tip
  make("crop_0", (g) => {
    fillRect(g, 7, 12, 2, 3, 0x2f7a3a);
  });
  make("crop_1", (g) => {
    fillRect(g, 7, 9, 2, 6, 0x3dff7a);
    fillRect(g, 6, 8, 4, 2, 0x2f7a3a);
  });
  make("crop_2", (g) => {
    fillRect(g, 7, 5, 2, 10, 0x3dff7a);
    fillRect(g, 5, 4, 6, 3, 0xffc94d);
  });
  make("crop_3", (g) => {
    fillRect(g, 7, 3, 2, 12, 0x2ecc71);
    fillRect(g, 4, 2, 8, 5, 0x3dff7a);
    fillRect(g, 6, 1, 4, 2, 0xffe08a);
  });
  make("crop_ready", (g) => {
    fillRect(g, 7, 2, 2, 13, 0x1a5c30);
    fillRect(g, 4, 1, 8, 6, 0x3dff7a);
    fillRect(g, 5, 0, 6, 3, 0xffe08a);
  });

  make("prop_fence", (g) => {
    fillRect(g, 1, 6, 14, 3, 0x8b5a2b);
    fillRect(g, 2, 4, 2, 8, 0x6b3e1f);
    fillRect(g, 12, 4, 2, 8, 0x6b3e1f);
  });
  make("prop_hay", (g) => {
    fillRect(g, 3, 8, 10, 6, 0xe8c48a);
    fillRect(g, 4, 6, 8, 3, 0xffe08a);
  });
  make("prop_crate", (g) => {
    fillRect(g, 3, 6, 10, 8, 0xa06a35);
    fillRect(g, 3, 6, 10, 2, 0xc4a06a);
  });
  make("prop_sign", (g) => {
    fillRect(g, 7, 4, 2, 10, 0x6b3e1f);
    fillRect(g, 3, 3, 10, 6, 0xe8c48a);
  });
  make("prop_tree", (g) => {
    fillRect(g, 7, 10, 2, 5, 0x6b3e1f);
    fillRect(g, 3, 3, 10, 9, 0x2f7a3a);
    fillRect(g, 5, 1, 6, 4, 0x3dff7a);
  });
  make("prop_sparkle", (g) => {
    fillRect(g, 6, 2, 4, 4, 0xffe08a);
    fillRect(g, 2, 6, 4, 4, 0x3dff7a);
    fillRect(g, 10, 6, 4, 4, 0xffc94d);
  });

  // Barn variants baked as larger 48×48 sheets then used at pixel scale
  const bakeBarn = (key: string, tier: 1 | 5 | 10 | 15 | 20) => {
    const g = scene.make.graphics({ x: 0, y: 0 });
    const w = 48;
    const h = 48;
    const roof =
      tier >= 20 ? 0xff4d6d : tier >= 15 ? 0x7c4dff : tier >= 10 ? 0x3dff7a : tier >= 5 ? 0xffc94d : 0xc44;
    const wall = tier >= 10 ? 0xf6e6c4 : 0xe8c48a;
    fillRect(g, 4, 18, 40, 26, wall);
    fillRect(g, 2, 10, 44, 12, roof);
    fillRect(g, 20, 28, 8, 16, 0x6b3e1f);
    if (tier >= 5) fillRect(g, 8, 24, 6, 6, 0x5eb1d4);
    if (tier >= 10) fillRect(g, 34, 24, 6, 6, 0x5eb1d4);
    if (tier >= 15) fillRect(g, 22, 4, 4, 8, 0xffe08a);
    if (tier >= 20) {
      fillRect(g, 18, 2, 12, 4, 0x3dff7a);
      fillRect(g, 40, 14, 4, 10, 0xffc94d);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  };
  bakeBarn("building_barn_l1", 1);
  bakeBarn("building_barn_l5", 5);
  bakeBarn("building_barn_l10", 10);
  bakeBarn("building_barn_l15", 15);
  bakeBarn("building_barn_l20", 20);
  // alias current
  bakeBarn("building_barn", 1);

  const silo = scene.make.graphics({ x: 0, y: 0 });
  fillRect(silo, 10, 8, 12, 36, 0xc4a06a);
  fillRect(silo, 8, 4, 16, 8, 0x8b5a2b);
  fillRect(silo, 12, 14, 8, 6, 0x5eb1d4);
  silo.generateTexture("building_silo", 32, 48);
  silo.destroy();
}

export class FarmScene extends Phaser.Scene {
  private cfg!: FarmSceneConfig;
  private plotHits = new Map<string, Phaser.GameObjects.Zone>();
  private cropSprites = new Map<string, Phaser.GameObjects.Image>();
  private progressRings = new Map<string, Phaser.GameObjects.Graphics>();
  private decorSprites = new Map<string, Phaser.GameObjects.Image>();
  private barnSprite?: Phaser.GameObjects.Image;
  private highlightGfx?: Phaser.GameObjects.Graphics;
  private camPadX = 0;
  private camPadY = 0;
  private bootBlocked = false;
  private loadFailed: string[] = [];

  constructor() {
    super("FarmScene");
  }

  init(data: FarmSceneConfig) {
    this.cfg = data;
    this.bootBlocked = false;
    this.loadFailed = [];
  }

  preload() {
    // All core art is baked in create(); optional UI sparkle from disk if present
    this.load.on("loaderror", (file: { key?: string }) => {
      this.loadFailed.push(String(file?.key ?? "unknown"));
    });
  }

  create() {
    bakePixelTextures(this);

    const missing = REQUIRED.filter((k) => {
      if (k === "building_barn") return !this.textures.exists("building_barn_l1");
      return !this.textures.exists(k);
    });
    if (missing.length || this.loadFailed.length) {
      this.bootBlocked = true;
      this.showError([...new Set([...missing, ...this.loadFailed])]);
      return;
    }

    this.cameras.main.setBackgroundColor("#87ceeb");
    this.cameras.main.setRoundPixels(true);

    this.buildWorld();
    this.highlightGfx = this.add.graphics().setDepth(9000);
    this.refreshHighlight();
    this.syncDecor(this.cfg.decor ?? []);

    if (this.cfg.expandPulse) {
      this.time.delayedCall(300, () => this.playExpandReveal());
    }

    this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        if (!this.bootBlocked) for (const p of this.cfg.plots) this.refreshCrop(p);
      },
    });
  }

  private showError(keys: string[]) {
    this.add
      .rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x1a1008, 0.95)
      .setScrollFactor(0)
      .setDepth(10000);
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, `Missing textures:\n${keys.join("\n")}`, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#ff6b9d",
        align: "center",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001);
  }

  private tileKey(cell: GroundCell) {
    switch (cell) {
      case "S":
        return "tile_soil";
      case "P":
        return "tile_path";
      case "W":
        return "tile_water";
      case "L":
        return "tile_locked";
      case "B":
        return "tile_dirt";
      default:
        return "tile_grass";
    }
  }

  private worldPos(gx: number, gy: number) {
    const p = gridToScreen(gx, gy);
    return { x: this.camPadX + p.x, y: this.camPadY + p.y };
  }

  private buildWorld() {
    const bounds = mapBounds();
    const mapW = (bounds.maxX - bounds.minX + 1) * TILE_SCREEN;
    const mapH = (bounds.maxY - bounds.minY + 1) * TILE_SCREEN;
    this.camPadX = Math.max(40, (this.scale.width - mapW) / 2);
    this.camPadY = Math.max(80, (this.scale.height - mapH) / 2 - 20);

    for (let gy = bounds.minY; gy <= bounds.maxY; gy++) {
      for (let gx = bounds.minX; gx <= bounds.maxX; gx++) {
        const cell = groundAt(gx, gy);
        const { x, y } = this.worldPos(gx, gy);
        this.add
          .image(x, y, this.tileKey(cell))
          .setOrigin(0, 0)
          .setDisplaySize(TILE_SCREEN, TILE_SCREEN)
          .setDepth(depthFromY(y, 0));
      }
    }

    // Expand sign on locked edge
    {
      const { x, y } = this.worldPos(bounds.maxX - 1, bounds.maxY - 1);
      const sign = this.add
        .image(x + TILE_SCREEN / 2, y + TILE_SCREEN / 2, "prop_sign")
        .setDisplaySize(TILE_SCREEN, TILE_SCREEN)
        .setInteractive({ useHandCursor: true })
        .setDepth(depthFromY(y, 5));
      sign.on("pointerdown", () => this.cfg.onExpandTap());
      this.tweens.add({ targets: sign, y: sign.y - 4, duration: 700, yoyo: true, repeat: -1 });
    }

    // Barn on building pad center (~ grid 2,2 in world with origin -1)
    {
      const barnGx = 2;
      const barnGy = 2;
      const { x, y } = this.worldPos(barnGx, barnGy);
      const key = `building_barn_l${barnVisualFromLevel(this.cfg.farmLevel)}`;
      this.barnSprite = this.add
        .image(x + TILE_SCREEN * 1.5, y + TILE_SCREEN * 1.2, key)
        .setOrigin(0.5, 1)
        .setDisplaySize(TILE_SCREEN * 3, TILE_SCREEN * 3)
        .setInteractive({ useHandCursor: true })
        .setDepth(depthFromY(y + TILE_SCREEN * 2, 8));
      this.barnSprite.on("pointerdown", () => this.cfg.onBarnTap());
    }

    // Silo
    {
      const { x, y } = this.worldPos(0, 1);
      const silo = this.add
        .image(x + TILE_SCREEN / 2, y + TILE_SCREEN, "building_silo")
        .setOrigin(0.5, 1)
        .setDisplaySize(TILE_SCREEN * 1.5, TILE_SCREEN * 2.2)
        .setInteractive({ useHandCursor: true })
        .setDepth(depthFromY(y + TILE_SCREEN, 8));
      silo.on("pointerdown", () => this.cfg.onSiloTap());
    }

    for (const plot of this.cfg.plots) {
      const { x, y } = this.worldPos(plot.gridX, plot.gridY);
      // Ensure soil under plot
      this.add
        .image(x, y, "tile_soil")
        .setOrigin(0, 0)
        .setDisplaySize(TILE_SCREEN, TILE_SCREEN)
        .setDepth(depthFromY(y, 1));

      const hit = this.add
        .zone(x + TILE_SCREEN / 2, y + TILE_SCREEN / 2, TILE_SCREEN * 0.9, TILE_SCREEN * 0.9)
        .setInteractive({ useHandCursor: true })
        .setDepth(depthFromY(y, 20));
      hit.on("pointerdown", () => {
        const fresh = this.cfg.plots.find((p) => p.id === plot.id);
        if (fresh) this.cfg.onPlotTap(fresh);
      });
      this.plotHits.set(plot.id, hit);
      this.refreshCrop(plot);
    }

    this.cameras.main.centerOn(
      this.camPadX + mapW / 2,
      this.camPadY + mapH / 2,
    );
  }

  updatePlots(plots: ScenePlot[]) {
    if (this.bootBlocked) return;
    this.cfg.plots = plots;
    for (const p of plots) this.refreshCrop(p);
  }

  setFarmLevel(level: number) {
    this.cfg.farmLevel = level;
    if (!this.barnSprite) return;
    const key = `building_barn_l${barnVisualFromLevel(level)}`;
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
    const { x, y } = this.worldPos(h.gridX, h.gridY);
    this.highlightGfx.lineStyle(4, 0x3dff7a, 1);
    this.highlightGfx.strokeRect(x + 2, y + 2, TILE_SCREEN - 4, TILE_SCREEN - 4);
  }

  syncDecor(decor: { id: string; itemId: string; gridX: number; gridY: number }[]) {
    this.cfg.decor = decor;
    if (this.bootBlocked) return;
    const keep = new Set(decor.map((d) => d.id));
    for (const [id, spr] of this.decorSprites) {
      if (!keep.has(id)) {
        spr.destroy();
        this.decorSprites.delete(id);
      }
    }
    for (const d of decor) {
      if (this.decorSprites.has(d.id)) continue;
      const key =
        d.itemId === "tree"
          ? "prop_tree"
          : d.itemId === "fence"
            ? "prop_fence"
            : d.itemId === "hay"
              ? "prop_hay"
              : d.itemId === "crate"
                ? "prop_crate"
                : "prop_sign";
      if (!this.textures.exists(key)) continue;
      const { x, y } = this.worldPos(d.gridX, d.gridY);
      const spr = this.add
        .image(x + TILE_SCREEN / 2, y + TILE_SCREEN / 2, key)
        .setDisplaySize(TILE_SCREEN, TILE_SCREEN)
        .setDepth(depthFromY(y, 6));
      this.decorSprites.set(d.id, spr);
      spr.setAlpha(0);
      this.tweens.add({ targets: spr, alpha: 1, duration: 220 });
    }
  }

  playExpandReveal() {
    const bounds = mapBounds();
    const { x, y } = this.worldPos(bounds.maxX - 1, Math.floor((bounds.minY + bounds.maxY) / 2));
    this.cameras.main.pan(x, y, 650, "Sine.easeInOut");
    const parts = this.add.particles(x, y, "prop_sparkle", {
      speed: { min: 20, max: 90 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0 },
      lifespan: 800,
      quantity: 18,
      emitting: false,
    });
    parts.setDepth(9500);
    parts.explode(22);
    this.time.delayedCall(900, () => parts.destroy());
  }

  playHarvestBurst(plotId: string) {
    const crop = this.cropSprites.get(plotId);
    if (!crop) return;
    const parts = this.add.particles(crop.x, crop.y - 10, "prop_sparkle", {
      speed: { min: 30, max: 100 },
      angle: { min: 200, max: 340 },
      scale: { start: 1, end: 0 },
      lifespan: 600,
      quantity: 12,
      emitting: false,
    });
    parts.setDepth(crop.depth + 5);
    parts.explode(14);
    this.tweens.add({
      targets: crop,
      alpha: 0,
      y: crop.y - 12,
      duration: 200,
      onComplete: () => crop.destroy(),
    });
    this.cropSprites.delete(plotId);
    this.progressRings.get(plotId)?.destroy();
    this.progressRings.delete(plotId);
    this.time.delayedCall(700, () => parts.destroy());
  }

  private refreshCrop(plot: ScenePlot) {
    const forceReady = this.cfg.tutorialInstantReadyPlotId === plot.id;
    const stage = forceReady ? 3 : growthStage(plot, Date.now());
    const { x, y } = this.worldPos(plot.gridX, plot.gridY);
    const cx = x + TILE_SCREEN / 2;
    const cy = y + TILE_SCREEN / 2;
    let existing = this.cropSprites.get(plot.id);
    let ring = this.progressRings.get(plot.id);

    if (stage < 0) {
      existing?.destroy();
      this.cropSprites.delete(plot.id);
      ring?.destroy();
      this.progressRings.delete(plot.id);
      return;
    }

    const key =
      forceReady || plot.status === "ready"
        ? "crop_ready"
        : plot.status === "blighted"
          ? "crop_0"
          : (`crop_${Math.min(3, stage)}` as const);

    if (!existing) {
      existing = this.add
        .image(cx, cy + 4, key)
        .setDepth(depthFromY(y, 4));
      existing.setDisplaySize(TILE_SCREEN * 0.85, TILE_SCREEN * 0.85);
      this.cropSprites.set(plot.id, existing);
      existing.setAlpha(0);
      this.tweens.add({ targets: existing, alpha: 1, duration: 180 });
    } else if (existing.texture.key !== key) {
      existing.setTexture(key);
    }

    if (!ring) {
      ring = this.add.graphics().setDepth(depthFromY(y, 5));
      this.progressRings.set(plot.id, ring);
    }
    ring.clear();
    if (!forceReady && plot.status === "growing" && plot.plantedAt && plot.maturesAt) {
      const start = new Date(plot.plantedAt).getTime();
      const end = new Date(plot.maturesAt).getTime();
      const p = Math.min(1, Math.max(0, (Date.now() - start) / Math.max(1, end - start)));
      ring.lineStyle(3, 0x3dff7a, 0.9);
      ring.beginPath();
      ring.arc(cx, cy, TILE_SCREEN * 0.38, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(-90 + p * 360), false);
      ring.strokePath();
    }

    if ((forceReady || plot.status === "ready") && !existing.getData("glow")) {
      existing.setData("glow", true);
      this.tweens.add({ targets: existing, alpha: 0.75, duration: 400, yoyo: true, repeat: -1 });
      ring.clear();
    }
  }
}
