import Phaser from "phaser";
import { TILE_SIZE, depthFromY, gridToScreen, integerZoom } from "@/game/tile";
import { mapPixelSize, soilCells } from "@/game/farmLayout";

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

const ASSET = "/assets/sprites/farming-sim";

const REQUIRED_KEYS = [
  "terrain",
  "farmhouse",
  "barn",
  "silo",
  "tree",
  "chicken",
  "crop_basic_0",
  "crop_basic_1",
  "crop_basic_2",
  "crop_basic_3",
  "crop_hybrid_0",
  "crop_hybrid_1",
  "crop_hybrid_2",
  "crop_hybrid_3",
  "crop_golden_0",
  "crop_golden_1",
  "crop_golden_2",
  "crop_golden_3",
  "crop_mythic_0",
  "crop_mythic_1",
  "crop_mythic_2",
  "crop_mythic_3",
] as const;

function growthStage(plot: ScenePlot, now: number): number {
  if (!plot.plantedAt || !plot.maturesAt || plot.status === "empty") return -1;
  if (plot.status === "blighted") return 3;
  if (plot.status === "ready") return 3;
  const start = new Date(plot.plantedAt).getTime();
  const end = new Date(plot.maturesAt).getTime();
  const p = Math.min(1, Math.max(0, (now - start) / Math.max(1, end - start)));
  if (p < 0.25) return 0;
  if (p < 0.5) return 1;
  if (p < 0.85) return 2;
  return 3;
}

function cropKey(tier: string | null, stage: number): string {
  const t = (tier ?? "Basic").toLowerCase();
  const safe = ["basic", "hybrid", "golden", "mythic"].includes(t) ? t : "basic";
  return `crop_${safe}_${Math.max(0, Math.min(3, stage))}`;
}

function propOf(obj: Phaser.Types.Tilemaps.TiledObject, key: string): string | number | undefined {
  const props = obj.properties as { name: string; value: string | number }[] | undefined;
  if (!props) return undefined;
  const hit = props.find((p) => p.name === key);
  return hit?.value;
}

export class FarmScene extends Phaser.Scene {
  private cfg!: FarmSceneConfig;
  private plotSprites = new Map<string, Phaser.GameObjects.Image>();
  private plotHits = new Map<string, Phaser.GameObjects.Zone>();
  private highlight?: Phaser.GameObjects.Rectangle;
  private buildingSprites = new Map<string, Phaser.GameObjects.Image>();
  private decorGroup?: Phaser.GameObjects.Group;
  private missingBanner?: Phaser.GameObjects.Text;
  private ready = false;

  constructor() {
    super("FarmScene");
  }

  init(data: FarmSceneConfig) {
    this.cfg = data;
  }

  preload() {
    this.load.image("terrain", `${ASSET}/tiles/terrain_spring.png`);
    this.load.tilemapTiledJSON("starter_farm", "/assets/maps/starter_farm.json");
    this.load.image("farmhouse", `${ASSET}/objects/farmhouse.png`);
    this.load.image("barn", `${ASSET}/objects/barn.png`);
    this.load.image("silo", `${ASSET}/objects/silo.png`);
    this.load.image("tree", `${ASSET}/objects/tree.png`);
    this.load.image("chicken", `${ASSET}/objects/chicken.png`);
    this.load.image("farmer", `${ASSET}/objects/farmer.png`);
    this.load.image("crate", "/assets/sprites/props/crate.png");
    this.load.image("hay", "/assets/sprites/props/hay.png");
    this.load.image("sign", "/assets/sprites/props/sign.png");
    this.load.image("fence", "/assets/sprites/props/fence.png");

    for (const tier of ["basic", "hybrid", "golden", "mythic"] as const) {
      for (let s = 0; s < 4; s++) {
        this.load.image(`crop_${tier}_${s}`, `${ASSET}/crops/${tier}/${s}.png`);
      }
    }

    this.load.on("loaderror", (file: { key: string }) => {
      this.showMissing([`loaderror:${file.key}`]);
    });
  }

  create() {
    const missing = REQUIRED_KEYS.filter((k) => !this.textures.exists(k));
    if (missing.length) {
      this.showMissing([...missing]);
      return;
    }

    const map = this.make.tilemap({ key: "starter_farm" });
    const tileset = map.addTilesetImage("terrain_spring", "terrain");
    if (!tileset) {
      this.showMissing(["tileset:terrain_spring"]);
      return;
    }

    const ground = map.createLayer("ground", tileset, 0, 0);
    if (!ground) {
      this.showMissing(["layer:ground"]);
      return;
    }
    ground.setDepth(0);

    const { width: mapW, height: mapH } = mapPixelSize();
    this.cameras.main.setBounds(0, 0, mapW, mapH);
    this.applyIntegerZoom(mapW, mapH);
    // Center on soil cluster / farmhouse path junction
    this.cameras.main.centerOn(12 * TILE_SIZE, 10 * TILE_SIZE);

    this.placeObjectLayer(map, "buildings", true);
    this.placeObjectLayer(map, "decor", false);

    this.decorGroup = this.add.group();
    this.syncDecor(this.cfg.decor ?? []);

    this.highlight = this.add
      .rectangle(0, 0, TILE_SIZE - 2, TILE_SIZE - 2)
      .setStrokeStyle(2, 0xfff2a8, 1)
      .setFillStyle(0xfff2a8, 0.15)
      .setVisible(false)
      .setDepth(50);

    this.redrawPlots(this.cfg.plots);
    this.setFarmLevel(this.cfg.farmLevel);
    this.setHighlightPlot(this.cfg.highlightPlot ?? null);
    this.setTutorialInstantReady(this.cfg.tutorialInstantReadyPlotId ?? null);

    this.scale.on("resize", () => this.applyIntegerZoom(mapW, mapH));
    this.ready = true;
  }

  private applyIntegerZoom(mapW: number, mapH: number) {
    const cam = this.cameras.main;
    const z = integerZoom(cam.width, cam.height, mapW, mapH);
    cam.setZoom(z);
  }

  private showMissing(keys: string[]) {
    const msg = `MISSING TEXTURES\n${keys.join("\n")}`;
    console.error(msg);
    this.missingBanner?.destroy();
    this.missingBanner = this.add
      .text(16, 16, msg, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#ffef9a",
        backgroundColor: "#5a1010",
        padding: { x: 10, y: 10 },
      })
      .setScrollFactor(0)
      .setDepth(9999);
  }

  private placeObjectLayer(map: Phaser.Tilemaps.Tilemap, layerName: string, interactiveBuildings: boolean) {
    const layer = map.getObjectLayer(layerName);
    if (!layer) return;
    for (const obj of layer.objects) {
      const spriteKey = String(propOf(obj, "sprite") ?? obj.name);
      if (!this.textures.exists(spriteKey)) {
        this.showMissing([spriteKey]);
        continue;
      }
      const img = this.add.image(obj.x ?? 0, obj.y ?? 0, spriteKey);
      img.setOrigin(0, 0);
      img.setDepth(depthFromY((obj.y ?? 0) + (obj.height ?? img.height)));

      const unlock = Number(propOf(obj, "unlockLevel") ?? 1);
      if (interactiveBuildings) {
        this.buildingSprites.set(obj.name, img);
        img.setInteractive({ useHandCursor: true });
        img.on("pointerdown", () => {
          if (obj.name === "barn" || obj.name === "farmhouse") this.cfg.onBarnTap();
          else if (obj.name === "silo") this.cfg.onSiloTap();
        });
        this.applyBuildingLock(obj.name, img, unlock, this.cfg.farmLevel);
      }
    }
  }

  private applyBuildingLock(name: string, img: Phaser.GameObjects.Image, unlock: number, level: number) {
    if (name === "farmhouse") {
      // Single farmhouse sprite in pack — tier via tint/decoration, not generated art.
      const tint =
        level >= 20 ? 0xffe0a0 : level >= 15 ? 0xffd0c0 : level >= 10 ? 0xffffff : level >= 5 ? 0xf0fff0 : 0xffffff;
      img.clearTint();
      if (tint !== 0xffffff) img.setTint(tint);
      img.setAlpha(1);
      return;
    }
    if (level < unlock) {
      img.setTint(0x666666);
      img.setAlpha(0.55);
    } else {
      img.clearTint();
      img.setAlpha(1);
    }
  }

  updatePlots(plots: ScenePlot[]) {
    this.cfg.plots = plots;
    if (!this.ready) return;
    this.redrawPlots(plots);
  }

  setFarmLevel(level: number) {
    this.cfg.farmLevel = level;
    if (!this.ready) return;
    for (const [name, img] of this.buildingSprites) {
      const unlock = name === "barn" ? 5 : name === "silo" ? 10 : 1;
      this.applyBuildingLock(name, img, unlock, level);
    }
  }

  setHighlightPlot(plot: { gridX: number; gridY: number } | null) {
    if (!this.highlight) return;
    if (!plot) {
      this.highlight.setVisible(false);
      return;
    }
    const { x, y } = gridToScreen(plot.gridX, plot.gridY);
    this.highlight.setPosition(x, y).setVisible(true);
  }

  setTutorialInstantReady(plotId: string | null) {
    this.cfg.tutorialInstantReadyPlotId = plotId;
  }

  playHarvestBurst(plotId: string) {
    const spr = this.plotSprites.get(plotId);
    if (!spr) return;
    this.tweens.add({
      targets: spr,
      scale: { from: 1.35, to: 1 },
      duration: 280,
      ease: "Back.easeOut",
    });
  }

  playExpandReveal() {
    this.cameras.main.flash(400, 180, 220, 140);
  }

  syncDecor(items: { id: string; itemId: string; gridX: number; gridY: number }[]) {
    if (!this.decorGroup) return;
    this.decorGroup.clear(true, true);
    for (const d of items) {
      const key = ["tree", "crate", "hay", "sign", "fence"].includes(d.itemId) ? d.itemId : "tree";
      if (!this.textures.exists(key)) continue;
      const { x, y } = gridToScreen(d.gridX, d.gridY);
      const img = this.add.image(x, y, key).setOrigin(0.5, 1);
      if (d.itemId === "tree") img.setScale(0.55);
      img.setDepth(depthFromY(y));
      this.decorGroup.add(img);
    }
  }

  private redrawPlots(plots: ScenePlot[]) {
    for (const [, spr] of this.plotSprites) spr.destroy();
    this.plotSprites.clear();
    for (const [, hit] of this.plotHits) hit.destroy();
    this.plotHits.clear();

    const now = Date.now();
    const byCell = new Map(plots.map((p) => [`${p.gridX},${p.gridY}`, p]));

    for (const cell of soilCells()) {
      const plot = byCell.get(`${cell.gridX},${cell.gridY}`);
      if (!plot) continue;
      const stage = growthStage(plot, now);
      const { x, y } = gridToScreen(cell.gridX, cell.gridY);

      const hit = this.add.zone(x, y, TILE_SIZE, TILE_SIZE).setDepth(40);
      hit.setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => this.cfg.onPlotTap(plot));
      this.plotHits.set(plot.id, hit);

      if (stage < 0) continue;
      const key = cropKey(plot.seedTier, stage);
      if (!this.textures.exists(key)) {
        this.showMissing([key]);
        continue;
      }
      const crop = this.add.image(x, y, key).setOrigin(0.5, 0.85);
      crop.setDepth(depthFromY(y + 4));
      if (plot.status === "ready" || this.cfg.tutorialInstantReadyPlotId === plot.id) {
        this.tweens.add({
          targets: crop,
          alpha: { from: 0.75, to: 1 },
          yoyo: true,
          repeat: -1,
          duration: 500,
        });
      }
      this.plotSprites.set(plot.id, crop);
    }
  }
}
