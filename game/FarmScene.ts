import Phaser from "phaser";

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
  barnTier: 1 | 2 | 3;
  siloTier: 1 | 2 | 3;
  onPlotTap: (plot: ScenePlot) => void;
  onExpandTap: () => void;
  onBarnTap: () => void;
  onSiloTap: () => void;
};

const TILE_W = 96;
const TILE_H = 48;

function isoToScreen(x: number, y: number) {
  return {
    x: (x - y) * (TILE_W / 2),
    y: (x + y) * (TILE_H / 2),
  };
}

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

/**
 * FarmScene — renderer only. World objects are ALWAYS raster PNGs from /assets/sprites.
 * Never draw terrain/buildings/crops with Graphics/SVG primitives.
 */
export class FarmScene extends Phaser.Scene {
  private cfg!: FarmSceneConfig;
  private plotSprites = new Map<string, Phaser.GameObjects.Container>();
  private cropSprites = new Map<string, Phaser.GameObjects.Image>();
  private originX = 0;
  private originY = 0;
  private waterFrames: Phaser.GameObjects.Image[] = [];
  private waterIdx = 0;

  constructor() {
    super("FarmScene");
  }

  init(data: FarmSceneConfig) {
    this.cfg = data;
  }

  preload() {
    const g = "/assets/sprites/ground";
    const d = "/assets/sprites/decor";
    const b = "/assets/sprites/buildings";
    const c = "/assets/sprites/crops";
    const p = "/assets/sprites/companions";
    const e = "/assets/sprites/effects";

    this.load.image("grass_1", `${g}/grass_1.png`);
    this.load.image("grass_2", `${g}/grass_2.png`);
    this.load.image("grass_3", `${g}/grass_3.png`);
    this.load.image("soil", `${g}/soil.png`);
    this.load.image("path", `${g}/path.png`);
    this.load.image("water_0", `${g}/water_0.png`);
    this.load.image("water_1", `${g}/water_1.png`);
    this.load.image("water_2", `${g}/water_2.png`);

    this.load.image("tree_1", `${d}/tree_1.png`);
    this.load.image("bush", `${d}/bush.png`);
    this.load.image("fence", `${d}/fence.png`);
    this.load.image("expand_sign", `${d}/expand_sign.png`);

    this.load.image("barn_1", `${b}/barn_1.png`);
    this.load.image("barn_2", `${b}/barn_2.png`);
    this.load.image("barn_3", `${b}/barn_3.png`);
    this.load.image("silo_1", `${b}/silo_1.png`);
    this.load.image("silo_2", `${b}/silo_2.png`);
    this.load.image("silo_3", `${b}/silo_3.png`);

    this.load.image("hound", `${p}/hype_hound.png`);
    this.load.image("sparkle", `${e}/sparkle.png`);

    for (const tier of ["basic", "hybrid", "golden", "mythic"] as const) {
      for (let s = 0; s < 4; s++) this.load.image(`${tier}_${s}`, `${c}/${tier}_${s}.png`);
      this.load.image(`${tier}_blight`, `${c}/${tier}_blight.png`);
    }
  }

  create() {
    const size = this.cfg.gridSize;
    this.originX = this.scale.width / 2;
    this.originY = this.scale.height * 0.34;

    // Soft sky clear only — not drawn world geometry
    this.cameras.main.setBackgroundColor("#8ec8e8");

    // Outer grass meadow (varied tiles) — real PNGs
    const meadowPad = 4;
    for (let y = -meadowPad; y < size + meadowPad; y++) {
      for (let x = -meadowPad; x < size + meadowPad; x++) {
        const inside = x >= 0 && y >= 0 && x < size && y < size;
        if (inside) continue;
        const { x: sx, y: sy } = this.tilePos(x, y);
        const variant = 1 + ((x * 3 + y * 7) % 3);
        const tile = this.add
          .image(sx, sy, `grass_${variant}`)
          .setDisplaySize(TILE_W + 8, TILE_H + 16)
          .setDepth(sy);
        void tile;
      }
    }

    // Water pond tiles (animated frames stacked, swap texture)
    const waterCells: [number, number][] = [
      [-2, 1],
      [-3, 1],
      [-2, 2],
      [-3, 2],
    ];
    for (const [wx, wy] of waterCells) {
      const { x: sx, y: sy } = this.tilePos(wx, wy);
      const img = this.add
        .image(sx, sy, "water_0")
        .setDisplaySize(TILE_W + 10, TILE_H + 18)
        .setDepth(sy + 1);
      this.waterFrames.push(img);
    }
    this.time.addEvent({
      delay: 550,
      loop: true,
      callback: () => {
        this.waterIdx = (this.waterIdx + 1) % 3;
        for (const img of this.waterFrames) img.setTexture(`water_${this.waterIdx}`);
      },
    });

    // Path from barn toward plots
    for (let i = 0; i < 4; i++) {
      const { x: sx, y: sy } = this.tilePos(-0.35, -0.4 + i * 0.45);
      this.add
        .image(sx, sy, "path")
        .setDisplaySize(TILE_W * 0.75, TILE_H * 0.85)
        .setDepth(sy - 1)
        .setAlpha(0.95);
    }

    // Decor trees / bushes (PNG props)
    const decor: [number, number, string, number][] = [
      [-3, -1, "tree_1", 0.95],
      [-4, 0, "tree_1", 0.8],
      [size + 1, -1, "bush", 1],
      [size + 1, size, "tree_1", 0.85],
      [-1, size + 1, "bush", 1.05],
      [size, size + 1, "bush", 0.9],
    ];
    for (const [gx, gy, key, sc] of decor) {
      const { x: sx, y: sy } = this.tilePos(gx, gy);
      this.add
        .image(sx, sy - 28, key)
        .setScale(sc)
        .setOrigin(0.5, 0.85)
        .setDepth(sy + 30);
    }

    // Fence line (PNG pieces)
    for (let i = 0; i < size; i++) {
      const { x: sx, y: sy } = this.tilePos(i, -0.65);
      this.add
        .image(sx, sy - 6, "fence")
        .setScale(0.7)
        .setOrigin(0.5, 0.8)
        .setDepth(sy + 8);
    }

    // Barn (PNG tier)
    const barnKey = `barn_${this.cfg.barnTier}` as "barn_1" | "barn_2" | "barn_3";
    const barnPos = this.tilePos(-1.2, -2.1);
    const barn = this.add
      .image(barnPos.x - 10, barnPos.y - 20, barnKey)
      .setDisplaySize(200, 200)
      .setOrigin(0.5, 0.85)
      .setInteractive({ useHandCursor: true })
      .setDepth(barnPos.y + 90);
    barn.on("pointerdown", () => {
      this.tweens.add({
        targets: barn,
        scaleX: barn.scaleX * 0.96,
        scaleY: barn.scaleY * 0.96,
        yoyo: true,
        duration: 90,
      });
      this.cfg.onBarnTap();
    });

    // Chimney smoke via sparkle particle (PNG), not drawn shapes
    this.add.particles(barn.x + 36, barn.y - 90, "sparkle", {
      speed: { min: 6, max: 16 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.12, end: 0.28 },
      alpha: { start: 0.28, end: 0 },
      lifespan: 1600,
      frequency: 380,
      tint: 0xdddddd,
    }).setDepth(barn.depth + 2);

    // Silo
    const siloKey = `silo_${this.cfg.siloTier}` as "silo_1" | "silo_2" | "silo_3";
    const siloPos = this.tilePos(size + 0.6, -1.2);
    const silo = this.add
      .image(siloPos.x, siloPos.y - 10, siloKey)
      .setDisplaySize(140, 160)
      .setOrigin(0.5, 0.85)
      .setInteractive({ useHandCursor: true })
      .setDepth(siloPos.y + 70);
    silo.on("pointerdown", () => this.cfg.onSiloTap());

    // Companion
    const dogPos = this.tilePos(0.2, -1.1);
    const dog = this.add
      .image(dogPos.x + 24, dogPos.y + 6, "hound")
      .setScale(0.85)
      .setOrigin(0.5, 0.85)
      .setDepth(dogPos.y + 55);
    this.tweens.add({
      targets: dog,
      y: dog.y - 5,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Tilled soil plots + hit zones
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const { x: sx, y: sy } = this.tilePos(x, y);
        const depth = sy;
        const tile = this.add
          .image(sx, sy, "soil")
          .setDisplaySize(TILE_W + 4, TILE_H + 14)
          .setDepth(depth);

        const plot = this.cfg.plots.find((pl) => pl.gridX === x && pl.gridY === y);
        if (!plot) continue;

        const plotId = plot.id;
        const hit = this.add
          .zone(sx, sy, TILE_W * 0.7, TILE_H * 0.7)
          .setInteractive({ useHandCursor: true })
          .setDepth(depth + 5);
        hit.on("pointerdown", () => {
          this.tweens.add({
            targets: tile,
            scaleX: 0.95,
            scaleY: 0.95,
            yoyo: true,
            duration: 80,
          });
          const fresh = this.cfg.plots.find((pl) => pl.id === plotId);
          if (fresh) this.cfg.onPlotTap(fresh);
        });
        this.plotSprites.set(plot.id, this.add.container(sx, sy).setDepth(depth + 2));
        this.refreshCrop(plot);
      }
    }

    // Expand signpost
    const exp = this.tilePos(size, Math.floor(size / 2));
    const sign = this.add
      .image(exp.x, exp.y - 18, "expand_sign")
      .setScale(0.9)
      .setOrigin(0.5, 0.85)
      .setInteractive({ useHandCursor: true })
      .setDepth(exp.y + 40);
    this.tweens.add({
      targets: sign,
      y: sign.y - 5,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
    sign.on("pointerdown", () => this.cfg.onExpandTap());

    this.cameras.main.centerOn(this.originX, this.originY + 50);

    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        for (const plot of this.cfg.plots) this.refreshCrop(plot);
      },
    });
  }

  private tilePos(gx: number, gy: number) {
    const p = isoToScreen(gx, gy);
    return { x: this.originX + p.x, y: this.originY + p.y };
  }

  updatePlots(plots: ScenePlot[]) {
    this.cfg.plots = plots;
    for (const plot of plots) this.refreshCrop(plot);
  }

  playHarvestBurst(plotId: string) {
    const crop = this.cropSprites.get(plotId);
    if (!crop) return;
    this.tweens.add({
      targets: crop,
      scaleX: 1.2,
      scaleY: 0.72,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        const parts = this.add.particles(crop.x, crop.y - 24, "sparkle", {
          speed: { min: 60, max: 160 },
          angle: { min: 220, max: 320 },
          scale: { start: 0.35, end: 0 },
          lifespan: 700,
          quantity: 12,
          emitting: false,
        });
        parts.explode(14);
        this.tweens.add({
          targets: crop,
          alpha: 0,
          duration: 200,
          onComplete: () => crop.destroy(),
        });
        this.time.delayedCall(800, () => parts.destroy());
      },
    });
  }

  private refreshCrop(plot: ScenePlot) {
    const container = this.plotSprites.get(plot.id);
    if (!container) return;
    const now = Date.now();
    const stage = growthStage(plot, now);
    let existing = this.cropSprites.get(plot.id);

    if (stage < 0) {
      existing?.destroy();
      this.cropSprites.delete(plot.id);
      return;
    }

    const key =
      plot.status === "blighted"
        ? `${tierKey(plot.seedTier)}_blight`
        : `${tierKey(plot.seedTier)}_${Math.min(3, stage)}`;

    if (!existing) {
      existing = this.add
        .image(container.x, container.y - 30, key)
        .setDepth(container.depth + 3)
        .setOrigin(0.5, 0.9);
      this.cropSprites.set(plot.id, existing);
      existing.setScale(0);
      this.tweens.add({ targets: existing, scale: 1, duration: 280, ease: "Back.easeOut" });
    } else if (existing.texture.key !== key) {
      existing.setTexture(key);
      this.tweens.add({ targets: existing, scale: 1.08, duration: 120, yoyo: true });
    }

    if (plot.status === "ready" && !existing.getData("glow")) {
      existing.setData("glow", true);
      this.tweens.add({
        targets: existing,
        alpha: 0.78,
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    }
  }
}
