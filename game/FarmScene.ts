import Phaser from "phaser";
import { TILE_SIZE, depthFromY, gridToScreen } from "@/game/tile";
import {
  farmCenterPixel,
  mapPixelSize,
  soilCells,
  SHOW_BUILDINGS,
  SHOW_FARMHOUSE,
  FARMHOUSE_POS,
  BARN_POS,
  SILO_POS,
  buildingFeetPixel,
  SOIL_CELLS,
} from "@/game/farmLayout";
import {
  CROP_SHEET,
  cropFrameForTier,
  isFlatFramePixels,
} from "@/game/cropFrames";
import {
  ANIMAL_SPECIES,
  type AnimalSpeciesId,
  type OwnedAnimal,
} from "@/lib/game/animals";
import {
  farmerHypePerSec,
  WORKER_SPRITE_TINT,
  type FarmerSpeciesId,
  type OwnedFarmer,
} from "@/lib/game/farmers";
import {
  assignPlotsToWorkers,
  coverageUpgradeBonus,
} from "@/lib/game/autoHarvest";
import { SEED_DEFS, type SeedTierId } from "@/lib/game/seeds";

type AnimalDir = "down" | "left" | "right" | "up";

type AnimalRuntime = {
  id: string;
  speciesId: AnimalSpeciesId;
  sprite: Phaser.GameObjects.Sprite;
  dir: AnimalDir;
  walking: boolean;
  stateUntil: number;
  speed: number;
};

type WorkerTask = "idle" | "walk" | "plant" | "harvest" | "wait";

type WorkerRuntime = {
  id: string;
  speciesId: FarmerSpeciesId;
  level: number;
  rate: number;
  root: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  rateText: Phaser.GameObjects.Text;
  levelText: Phaser.GameObjects.Text;
  waitMark: Phaser.GameObjects.Text;
  dir: AnimalDir;
  walking: boolean;
  plowing: boolean;
  stateUntil: number;
  speed: number;
  nextFloatAt: number;
  assignedPlotIds: string[];
  task: WorkerTask;
  targetPlotId: string | null;
  /** True while an API callback is in flight for a plot action. */
  pendingAction: boolean;
};

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

export type SceneWorker = {
  id: string;
  deployed: boolean;
  speciesId: FarmerSpeciesId;
  level: number;
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
  onNpcTap?: (npc: "foreman" | "pierre" | "chick") => void;
  /** Visible auto-farm: worker finished harvest anim → same juice path as manual. */
  onWorkerHarvest?: (plot: ScenePlot, workerId: string) => void;
  /** Visible auto-farm: worker finished plant anim. */
  onWorkerPlant?: (plot: ScenePlot, workerId: string, seedTier: SeedTierId) => void;
  highlightPlot?: { gridX: number; gridY: number } | null;
  tutorialInstantReadyPlotId?: string | null;
  expandPulse?: number;
  decor?: { id: string; itemId: string; gridX: number; gridY: number }[];
  workers?: SceneWorker[];
  animals?: OwnedAnimal[];
  autoSeedTier?: SeedTierId;
  hypeBalance?: number;
  workerUpgradeBonus?: number;
};

const ASSET = "/assets/sprites/farming-sim";

function growthStage(plot: ScenePlot, now: number): 0 | 1 | 2 | 3 | -1 {
  if (!plot.plantedAt || !plot.maturesAt || plot.status === "empty") return -1;
  if (plot.status === "blighted" || plot.status === "ready") return 3;
  const start = new Date(plot.plantedAt).getTime();
  const end = new Date(plot.maturesAt).getTime();
  const p = Math.min(1, Math.max(0, (now - start) / Math.max(1, end - start)));
  if (p < 0.25) return 0;
  if (p < 0.5) return 1;
  if (p < 0.85) return 2;
  return 3;
}

function propOf(obj: Phaser.Types.Tilemaps.TiledObject, key: string): string | number | undefined {
  const props = obj.properties as { name: string; value: string | number }[] | undefined;
  return props?.find((p) => p.name === key)?.value;
}

export class FarmScene extends Phaser.Scene {
  private cfg!: FarmSceneConfig;
  private plotSprites = new Map<string, Phaser.GameObjects.Image>();
  private plotBeds = new Map<string, Phaser.GameObjects.Image>();
  private plotHints = new Map<string, Phaser.GameObjects.Rectangle>();
  private plotHits = new Map<string, Phaser.GameObjects.Zone>();
  private highlight?: Phaser.GameObjects.Rectangle;
  private buildingSprites = new Map<string, Phaser.GameObjects.Image>();
  private decorGroup?: Phaser.GameObjects.Group;
  private animalRuntimes = new Map<string, AnimalRuntime>();
  private workerRuntimes = new Map<string, WorkerRuntime>();
  private animalAnimsReady = false;
  private workerAnimsReady = false;
  private missingBanner?: Phaser.GameObjects.Text;
  private ready = false;
  private flatWarned = new Set<string>();
  private readonly soilBlocked = new Set(
    SOIL_CELLS.map((c) => `${c.gridX},${c.gridY}`),
  );

  /** Camera: free pan + zoom (never fit-to-tiny-map). */
  private readonly minZoom = 0.55;
  private readonly maxZoom = 2.8;
  private readonly zoomLerp = 0.085;
  private targetZoom = 1;
  private zoomFocusX = 0;
  private zoomFocusY = 0;
  private zoomSmoothing = false;
  private dragActive = false;
  private dragMoved = false;
  private dragPointerId: number | null = null;
  private pinchStartDist = 0;
  private pinchStartZoom = 1;
  private pinching = false;

  constructor() {
    super("FarmScene");
  }

  init(data: FarmSceneConfig) {
    this.cfg = data;
  }

  preload() {
    this.load.image("terrains", `${ASSET}/tiles/terrains.png`);
    this.load.tilemapTiledJSON("starter_farm", "/assets/maps/starter_farm.json?v=11");
    this.load.spritesheet(CROP_SHEET.key, CROP_SHEET.path, {
      frameWidth: CROP_SHEET.frameWidth,
      frameHeight: CROP_SHEET.frameHeight,
    });

    this.load.image("farmhouse", `${ASSET}/objects/farmhouse.png`);
    this.load.image("barn", `${ASSET}/objects/barn.png`);
    this.load.image("silo", `${ASSET}/objects/silo.png`);
    this.load.image("tree", `${ASSET}/objects/tree.png`);
    this.load.image("chicken", `${ASSET}/objects/chicken.png`);
    this.load.image("farmer", `${ASSET}/objects/farmer.png`);
    this.load.image("crate", `${ASSET}/objects/crate.png`);
    this.load.image("hay", `${ASSET}/objects/hay.png`);
    this.load.image("bush", `${ASSET}/objects/bush.png`);
    this.load.image("rock", `${ASSET}/objects/rock.png`);
    this.load.image("stump", `${ASSET}/objects/stump.png`);
    this.load.image("sign", `${ASSET}/objects/sign.png`);
    this.load.image("grass_fill", `${ASSET}/objects/grass_fill.png`);
    this.load.image("plot_soil", `${ASSET}/objects/plot_soil.png`);
    this.load.image("plot_soil_wet", `${ASSET}/objects/plot_soil_wet.png`);
    this.load.image("tile_path", `${ASSET}/objects/tile_path.png`);
    this.load.image("fence_0", `${ASSET}/objects/fence_0.png`);
    this.load.image("fence_v", `${ASSET}/objects/fence_v.png`);
    this.load.image("fence_post", `${ASSET}/objects/fence_post.png`);

    for (const sp of Object.values(ANIMAL_SPECIES)) {
      this.load.spritesheet(`animal_${sp.id}`, `/assets/sprites/animals/${sp.sheet}`, {
        frameWidth: sp.frameSize,
        frameHeight: sp.frameSize,
      });
    }

    this.load.spritesheet("farmer_walk", "/assets/sprites/animals/farmer_walk.png", {
      frameWidth: 32,
      frameHeight: 64,
    });
    this.load.spritesheet("farmer_plow", "/assets/sprites/animals/farmer_plow.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.image("hud_hype", "/assets/icons/hype.png");

    this.load.on("loaderror", (file: { key: string }) => {
      this.showMissing([`loaderror:${file.key}`]);
    });
  }

  create() {
    const sheet = this.textures.get(CROP_SHEET.key);
    const frameTotal = sheet?.frameTotal ?? 0;
    const expected = CROP_SHEET.columns * CROP_SHEET.rows;
    if (!this.textures.exists("terrains") || frameTotal < expected) {
      this.showMissing([
        !this.textures.exists("terrains") ? "terrains" : "",
        frameTotal < expected ? `crops_sheet frames=${frameTotal} expected=${expected}` : "",
      ].filter(Boolean));
      return;
    }

    const map = this.make.tilemap({ key: "starter_farm" });
    const tileset = map.addTilesetImage("terrains", "terrains");
    if (!tileset) {
      this.showMissing(["tileset:terrains"]);
      return;
    }
    const ground = map.createLayer("ground", tileset, 0, 0);
    if (!ground) {
      this.showMissing(["layer:ground"]);
      return;
    }
    ground.setDepth(0);

    const { width: mapW, height: mapH } = mapPixelSize();
    // Full-world grass so pan never hits a flat void / seam
    if (this.textures.exists("grass_fill")) {
      this.add
        .tileSprite(mapW / 2, mapH / 2, mapW + 128, mapH + 128, "grass_fill")
        .setDepth(-1);
    }

    this.placeObjectLayer(map, "buildings", true);
    this.placeObjectLayer(map, "decor", false);
    this.stampWornPath();
    this.scatterSeamTufts(map);

    this.decorGroup = this.add.group();
    // Decor placement disabled for now — no movable-prop system yet
    this.syncDecor([]);
    this.ensureWorkerAnims();
    this.syncWorkers(this.cfg.workers ?? []);
    this.ensureAnimalAnims();
    this.syncAnimals(this.cfg.animals ?? []);

    this.highlight = this.add
      .rectangle(0, 0, TILE_SIZE - 2, TILE_SIZE - 2)
      .setStrokeStyle(2, 0xfff2a8, 1)
      .setFillStyle(0xfff2a8, 0.18)
      .setVisible(false)
      .setDepth(50);

    this.redrawPlots(this.cfg.plots);
    this.setFarmLevel(this.cfg.farmLevel);
    this.setHighlightPlot(this.cfg.highlightPlot ?? null);

    this.setupCamera(mapW, mapH);
    this.setupPanZoom();
    this.scale.on("resize", () => this.clampCamera());
    this.ready = true;
  }

  private setupCamera(mapW: number, mapH: number) {
    const cam = this.cameras.main;
    cam.setBackgroundColor("#92c868");
    // Extra top pad so multi-tile-tall roofs (farmhouse/barn/silo) never clip at world edge
    const roofPad = 160;
    cam.setBounds(0, -roofPad, mapW, mapH + roofPad);
    cam.setRoundPixels(true);

    // Zoom to farmyard + crop field as one hub (buildings included, not plots-only)
    const hubW = 18 * TILE_SIZE;
    const hubH = 16 * TILE_SIZE;
    const viewW = Math.max(240, cam.width - 24);
    // Leave room under top HUD so roofs aren't covered
    const viewH = Math.max(240, cam.height - 200);
    const fit = Math.min(viewW / hubW, viewH / hubH);
    const z = Phaser.Math.Clamp(fit * 0.88, this.minZoom, this.maxZoom);
    cam.setZoom(z);
    this.targetZoom = z;
    this.zoomSmoothing = false;
    const center = farmCenterPixel();
    // Bias slightly toward farmyard (north of plots) so roofs stay in frame with grass above
    const focusX = center.x;
    const focusY = center.y - 20;
    cam.centerOn(focusX, focusY);
    this.zoomFocusX = focusX;
    this.zoomFocusY = focusY;
  }

  private setupPanZoom() {
    this.input.addPointer(3);

    this.input.on(
      "wheel",
      (
        pointer: Phaser.Input.Pointer,
        _over: unknown,
        _dx: number,
        dy: number,
        _dz: number,
        event: WheelEvent,
      ) => {
        event?.preventDefault?.();
        // Soft exponential step from wheel delta (slower than before)
        const steps = Phaser.Math.Clamp(Math.abs(dy) / 120, 0.35, 2.2);
        const factor = dy > 0 ? Math.pow(0.94, steps) : Math.pow(1.06, steps);
        this.queueZoom(pointer.worldX, pointer.worldY, this.targetZoom * factor);
      },
    );

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
        this.pinching = true;
        this.pinchStartDist = Phaser.Math.Distance.Between(
          this.input.pointer1.x,
          this.input.pointer1.y,
          this.input.pointer2.x,
          this.input.pointer2.y,
        );
        this.pinchStartZoom = this.cameras.main.zoom;
        this.dragActive = false;
        return;
      }
      this.dragPointerId = p.id;
      this.dragActive = true;
      this.dragMoved = false;
    });

    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      const cam = this.cameras.main;

      if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
        const dist = Phaser.Math.Distance.Between(
          this.input.pointer1.x,
          this.input.pointer1.y,
          this.input.pointer2.x,
          this.input.pointer2.y,
        );
        if (this.pinchStartDist > 8) {
          const raw = this.pinchStartZoom * (dist / this.pinchStartDist);
          // Soften pinch response so it doesn't jump
          const eased = this.pinchStartZoom + (raw - this.pinchStartZoom) * 0.55;
          const next = Phaser.Math.Clamp(eased, this.minZoom, this.maxZoom);
          const midX = (this.input.pointer1.worldX + this.input.pointer2.worldX) / 2;
          const midY = (this.input.pointer1.worldY + this.input.pointer2.worldY) / 2;
          this.targetZoom = next;
          this.zoomFocusX = midX;
          this.zoomFocusY = midY;
          this.zoomSmoothing = true;
          this.applyZoomToward(0.22);
        }
        this.pinching = true;
        this.dragMoved = true;
        return;
      }

      if (!this.dragActive || !p.isDown || p.id !== this.dragPointerId) return;
      const dx = p.x - p.prevPosition.x;
      const dy = p.y - p.prevPosition.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) this.dragMoved = true;
      if (!this.dragMoved) return;
      cam.scrollX -= dx / cam.zoom;
      cam.scrollY -= dy / cam.zoom;
      this.clampCamera();
    });

    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (p.id === this.dragPointerId) {
        this.dragActive = false;
        this.dragPointerId = null;
        // Keep dragMoved true briefly so plot taps from the same gesture are ignored
        this.time.delayedCall(40, () => {
          if (!this.dragActive) this.dragMoved = false;
        });
      }
      if (!this.input.pointer1.isDown || !this.input.pointer2.isDown) {
        this.pinching = false;
        this.pinchStartDist = 0;
      }
    });
  }

  private queueZoom(worldX: number, worldY: number, nextZoom: number) {
    this.targetZoom = Phaser.Math.Clamp(nextZoom, this.minZoom, this.maxZoom);
    this.zoomFocusX = worldX;
    this.zoomFocusY = worldY;
    this.zoomSmoothing = true;
  }

  private applyZoomToward(alpha = this.zoomLerp) {
    const cam = this.cameras.main;
    const prev = cam.zoom;
    const next = Phaser.Math.Linear(prev, this.targetZoom, alpha);
    if (Math.abs(next - this.targetZoom) < 0.0015) {
      cam.setZoom(this.targetZoom);
      this.zoomSmoothing = false;
    } else {
      cam.setZoom(next);
    }
    // Keep focus world point under the same screen position
    const ptr = this.input.activePointer;
    const screenX = this.pinching
      ? (this.input.pointer1.x + this.input.pointer2.x) / 2
      : ptr.x;
    const screenY = this.pinching
      ? (this.input.pointer1.y + this.input.pointer2.y) / 2
      : ptr.y;
    const under = cam.getWorldPoint(screenX, screenY);
    cam.scrollX += this.zoomFocusX - under.x;
    cam.scrollY += this.zoomFocusY - under.y;
    this.clampCamera();
  }

  update(_time: number, delta: number) {
    if (this.ready) {
      this.tickAnimals(delta);
      this.tickWorkers(delta);
    }
    if (!this.ready || !this.zoomSmoothing || this.pinching) return;
    this.applyZoomToward(this.zoomLerp);
  }

  private clampCamera() {
    const cam = this.cameras.main;
    const z = Phaser.Math.Clamp(cam.zoom, this.minZoom, this.maxZoom);
    if (z !== cam.zoom) cam.setZoom(z);
    this.targetZoom = Phaser.Math.Clamp(this.targetZoom, this.minZoom, this.maxZoom);
    const { width: mapW, height: mapH } = mapPixelSize();
    const roofPad = 160;
    cam.setBounds(0, -roofPad, mapW, mapH + roofPad);
  }

  private didDragGesture(): boolean {
    return this.dragMoved || this.pinching;
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

  /** Worn path from south entrance → west of crops → farmyard cluster. */
  private stampWornPath() {
    if (!this.textures.exists("tile_path")) return;
    const cells: { gridX: number; gridY: number }[] = [
      { gridX: 23, gridY: 27 },
      { gridX: 23, gridY: 26 },
      { gridX: 23, gridY: 25 },
      { gridX: 22, gridY: 25 },
      { gridX: 21, gridY: 25 },
      { gridX: 21, gridY: 24 },
      { gridX: 21, gridY: 23 },
      { gridX: 21, gridY: 22 },
      { gridX: 21, gridY: 21 },
      { gridX: 21, gridY: 20 },
      { gridX: 21, gridY: 19 },
      { gridX: 22, gridY: 19 },
      { gridX: 23, gridY: 19 },
      { gridX: 23, gridY: 18 },
      { gridX: 24, gridY: 18 },
      { gridX: 24, gridY: 17 },
      { gridX: 25, gridY: 17 },
      { gridX: 25, gridY: 16 },
    ];
    for (const cell of cells) {
      const { x, y } = gridToScreen(cell.gridX, cell.gridY);
      this.add
        .image(x, y, "tile_path")
        .setOrigin(0.5, 0.5)
        .setDisplaySize(TILE_SIZE + 2, TILE_SIZE + 2)
        .setDepth(2)
        .setAlpha(0.92);
    }
  }

  /** Soften dirt↔grass seam with sparse bush tufts (visual only). */
  private scatterSeamTufts(map: Phaser.Tilemaps.Tilemap) {
    if (!this.textures.exists("bush")) return;
    const ground = map.getLayer("ground")?.tilemapLayer;
    if (!ground) return;
    const grassGids = new Set([2, 3, 4, 5, 12, 13]);
    const dirtish = (gid: number) => gid >= 17 && gid <= 51;
    // Keep barn/silo + crop paddock clear — no tufts on/over soil tiles
    const soilKeys = new Set(SOIL_CELLS.map((c) => `${c.gridX},${c.gridY}`));
    const inBuildingClearZone = (tx: number, ty: number) => {
      if (tx >= 20.5 && tx <= 28 && ty >= 14 && ty <= 19.5) return true;
      // Fence ring + 3×3 field (and 1-tile apron) — bushes were covering crops
      if (tx >= 21 && tx <= 25 && ty >= 19 && ty <= 24) return true;
      if (soilKeys.has(`${tx},${ty}`)) return true;
      return false;
    };
    let n = 0;
    for (let ty = 1; ty < map.height - 1 && n < 22; ty++) {
      for (let tx = 1; tx < map.width - 1 && n < 22; tx++) {
        if (inBuildingClearZone(tx, ty)) continue;
        const t = ground.getTileAt(tx, ty);
        if (!t || !dirtish(t.index)) continue;
        const neighbors = [
          ground.getTileAt(tx, ty - 1),
          ground.getTileAt(tx, ty + 1),
          ground.getTileAt(tx - 1, ty),
          ground.getTileAt(tx + 1, ty),
        ];
        const onSeam = neighbors.some((nb) => nb && grassGids.has(nb.index));
        if (!onSeam) continue;
        if ((tx * 17 + ty * 31) % 4 !== 0) continue;
        const { x, y } = gridToScreen(tx, ty);
        this.add
          .image(x + ((tx * 13) % 7) - 3, y + TILE_SIZE * 0.35, "bush")
          .setOrigin(0.5, 1)
          .setScale(0.7 + ((tx + ty) % 3) * 0.1)
          .setDepth(depthFromY(y + 4))
          .setAlpha(0.95);
        n += 1;
      }
    }
  }

  private placeObjectLayer(
    map: Phaser.Tilemaps.Tilemap,
    layerName: string,
    interactiveBuildings: boolean,
  ) {
    const layer = map.getObjectLayer(layerName);
    if (!layer) return;
    // Slightly larger so barn/silo read as the yard's anchors (not dwarfed by dirt)
    const buildingScale: Record<string, number> = {
      farmhouse: 0.62,
      barn: 0.74,
      silo: 0.7,
    };
    const decorScale: Record<string, number> = {
      tree: 0.72,
      bush: 1,
      chicken: 1.05,
      farmer: 1,
    };
    for (const obj of layer.objects) {
      const spriteKey = String(propOf(obj, "sprite") ?? obj.name);
      if (spriteKey === "sign" || spriteKey === "locked_sign") continue;
      const isBuilding =
        obj.name === "barn" || obj.name === "farmhouse" || obj.name === "silo";
      if (isBuilding && !SHOW_BUILDINGS) continue;
      if (obj.name === "farmhouse" && !SHOW_FARMHOUSE) continue;
      if (!this.textures.exists(spriteKey)) {
        if (!(spriteKey.startsWith("fence") && this.textures.exists("fence_0"))) {
          continue;
        }
      }
      const key = this.textures.exists(spriteKey) ? spriteKey : "fence_0";
      // Prefer editable constants over Tiled object coords for the three buildings
      let px = obj.x ?? 0;
      let py = obj.y ?? 0;
      if (isBuilding) {
        const pos =
          obj.name === "farmhouse"
            ? FARMHOUSE_POS
            : obj.name === "barn"
              ? BARN_POS
              : SILO_POS;
        const feet = buildingFeetPixel(pos);
        px = feet.x;
        py = feet.y;
      }
      const img = this.add.image(px, py, key);
      // Feet-center anchors; bottom-center origin so roofs aren't clipped
      if (isBuilding || key === "farmer" || key === "tree" || key === "chicken" || key === "bush") {
        img.setOrigin(0.5, 1);
      } else {
        img.setOrigin(0, 0);
      }
      const sc = buildingScale[obj.name] ?? decorScale[spriteKey] ?? decorScale[obj.name] ?? 1;
      if (sc !== 1) img.setScale(sc);
      img.setDepth(depthFromY(py));

      if (interactiveBuildings && isBuilding) {
        this.buildingSprites.set(obj.name, img);
        img.setInteractive({ useHandCursor: true });
        img.on("pointerup", () => {
          if (this.didDragGesture()) return;
          if (obj.name === "farmhouse") this.cfg.onNpcTap?.("pierre");
          else if (obj.name === "barn") this.cfg.onBarnTap();
          else if (obj.name === "silo") this.cfg.onSiloTap();
        });
        const unlock = Number(propOf(obj, "unlockLevel") ?? 1);
        this.applyBuildingLock(obj.name, img, unlock, this.cfg.farmLevel);
      } else if (key === "farmer" || key === "chicken") {
        img.setInteractive({ useHandCursor: true });
        img.on("pointerup", () => {
          if (this.didDragGesture()) return;
          if (key === "farmer") this.cfg.onNpcTap?.("foreman");
          else this.cfg.onNpcTap?.("chick");
        });
      }
    }
  }

  private applyBuildingLock(name: string, img: Phaser.GameObjects.Image, unlock: number, level: number) {
    // Never use transparency — ghosts looked like overlapping duplicates
    img.setAlpha(1);
    if (name === "farmhouse") {
      img.clearTint();
      return;
    }
    if (level < unlock) {
      img.setTint(0x888888);
    } else {
      img.clearTint();
    }
  }

  updatePlots(plots: ScenePlot[]) {
    this.cfg.plots = plots;
    if (!this.ready) return;
    this.redrawPlots(plots);
    this.reassignWorkerPlots();
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

  playHarvestBurst(plotId: string, opts?: { combo?: number }) {
    const spr = this.plotSprites.get(plotId);
    const bed = this.plotBeds.get(plotId);
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const combo = Math.min(5, opts?.combo ?? 1);

    if (spr && !reduce) {
      const base = spr.scaleX || 1.25;
      this.tweens.add({
        targets: spr,
        scale: { from: base * 1.35, to: 0 },
        alpha: { from: 1, to: 0 },
        y: spr.y - 10,
        duration: 280,
        ease: "Back.easeIn",
      });
      // Leaf/sparkle particles
      const n = 6 + combo * 2;
      for (let i = 0; i < n; i++) {
        const bit = this.add
          .rectangle(spr.x, spr.y - 8, 3, 3, i % 2 === 0 ? 0xffe08a : 0x7bb85c)
          .setDepth(200);
        this.tweens.add({
          targets: bit,
          x: spr.x + Phaser.Math.Between(-28, 28),
          y: spr.y + Phaser.Math.Between(-40, -8),
          alpha: { from: 1, to: 0 },
          duration: 380 + i * 20,
          ease: "Cubic.easeOut",
          onComplete: () => bit.destroy(),
        });
      }
    } else if (spr) {
      spr.setVisible(false);
    }

    // Farmer hop near the plot (anticipation → payoff)
    if (this.textures.exists("farmer") && bed && !reduce) {
      const farmer = this.add
        .image(bed.x - 14, bed.y + 6, "farmer")
        .setOrigin(0.5, 1)
        .setDepth(depthFromY(bed.y + 20))
        .setScale(1);
      this.tweens.add({
        targets: farmer,
        y: farmer.y - 6,
        duration: 90,
        yoyo: true,
        onComplete: () => {
          this.tweens.add({
            targets: farmer,
            alpha: 0,
            duration: 120,
            delay: 80,
            onComplete: () => farmer.destroy(),
          });
        },
      });
    }

    if (!reduce && combo >= 2) {
      this.cameras.main.shake(60 + combo * 10, 0.002 * combo);
    }
  }

  /** Screen-space point for fly-to-HUD (CSS pixels relative to game canvas). */
  getPlotScreenPoint(plotId: string): { x: number; y: number } | null {
    const spr = this.plotSprites.get(plotId) ?? this.plotBeds.get(plotId);
    if (!spr) return null;
    const cam = this.cameras.main;
    const sx = ((spr.x - cam.worldView.x) / cam.worldView.width) * cam.width;
    const sy = ((spr.y - cam.worldView.y) / cam.worldView.height) * cam.height;
    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + sx * (rect.width / cam.width),
      y: rect.top + sy * (rect.height / cam.height),
    };
  }

  playExpandReveal() {
    this.cameras.main.flash(400, 180, 220, 140);
  }

  syncDecor(items: { id: string; itemId: string; gridX: number; gridY: number }[]) {
    if (!this.decorGroup) return;
    this.decorGroup.clear(true, true);
    const texFor: Record<string, string> = {
      fence: "fence_0",
      hay: "hay",
      crate: "crate",
      tree: "tree",
      bush: "bush",
      rock: "rock",
      stump: "stump",
      chicken: "chicken",
      sign: "sign",
    };
    for (const d of items) {
      const key = texFor[d.itemId] ?? d.itemId;
      if (!this.textures.exists(key)) continue;
      const { x, y } = gridToScreen(d.gridX, d.gridY);
      const img = this.add.image(x, y, key).setOrigin(0.5, 1);
      if (d.itemId === "tree") img.setScale(0.72);
      if (d.itemId === "chicken") img.setScale(0.85);
      img.setDepth(depthFromY(y));
      this.decorGroup.add(img);
    }
  }

  syncWorkers(workers: SceneWorker[]) {
    this.cfg.workers = workers;
    if (!this.ready && this.workerRuntimes.size === 0 && workers.length === 0) return;
    this.ensureWorkerAnims();

    const deployed = workers.filter((w) => w.deployed);
    const keep = new Set(deployed.map((w) => w.id));
    for (const [id, rt] of this.workerRuntimes) {
      if (!keep.has(id)) {
        rt.root.destroy(true);
        this.workerRuntimes.delete(id);
      }
    }

    this.reassignWorkerPlots();

    deployed.forEach((w, i) => {
      const rate = farmerHypePerSec({
        id: w.id,
        speciesId: w.speciesId,
        level: w.level,
        deployed: true,
        hiredAt: "",
      } satisfies OwnedFarmer);
      const existing = this.workerRuntimes.get(w.id);
      if (existing) {
        existing.level = w.level;
        existing.speciesId = w.speciesId;
        existing.rate = rate;
        existing.speed = this.workerSpeedForLevel(w.level);
        existing.assignedPlotIds = this.assignmentFor(w.id);
        this.applyWorkerLook(existing);
        this.refreshWorkerHud(existing);
        return;
      }
      if (!this.textures.exists("farmer_walk")) return;
      const feet = this.randomYardFeet(i + 3 + this.workerRuntimes.size);
      const root = this.add.container(feet.x, feet.y);
      root.setDepth(depthFromY(feet.y));

      const spr = this.add.sprite(0, 0, "farmer_walk", 0).setOrigin(0.5, 1);
      spr.setInteractive({ useHandCursor: true });
      spr.on("pointerup", () => {
        if (this.didDragGesture()) return;
        this.cfg.onNpcTap?.("foreman");
      });

      const levelText = this.add
        .text(0, -46, `Lv${w.level}`, {
          fontFamily: "monospace",
          fontSize: "8px",
          color: "#ffe08a",
          stroke: "#3a2414",
          strokeThickness: 3,
        })
        .setOrigin(0.5, 1);

      const coin = this.textures.exists("hud_hype")
        ? this.add.image(-14, -34, "hud_hype").setDisplaySize(10, 10).setOrigin(0.5, 0.5)
        : this.add.circle(-14, -34, 4, 0x3dff7a).setStrokeStyle(1, 0x3a2414);

      const rateText = this.add
        .text(-6, -34, `${rate.toFixed(2)}/s`, {
          fontFamily: "monospace",
          fontSize: "8px",
          color: "#3dff7a",
          stroke: "#06140c",
          strokeThickness: 3,
        })
        .setOrigin(0, 0.5);

      const waitMark = this.add
        .text(0, -56, "…", {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#ffc94d",
          stroke: "#3a2414",
          strokeThickness: 3,
        })
        .setOrigin(0.5, 1)
        .setVisible(false);

      root.add([spr, levelText, coin, rateText, waitMark]);

      const rt: WorkerRuntime = {
        id: w.id,
        speciesId: w.speciesId,
        level: w.level,
        rate,
        root,
        sprite: spr,
        rateText,
        levelText,
        waitMark,
        dir: "down",
        walking: false,
        plowing: false,
        stateUntil: this.time.now + 600 + i * 180,
        speed: this.workerSpeedForLevel(w.level),
        nextFloatAt: this.time.now + 800 + i * 400,
        assignedPlotIds: this.assignmentFor(w.id),
        task: "idle",
        targetPlotId: null,
        pendingAction: false,
      };
      this.applyWorkerLook(rt);
      this.refreshWorkerHud(rt);
      this.playWorkerAnim(rt);
      this.workerRuntimes.set(w.id, rt);
    });
  }

  /** Refresh auto-seed / hype for visible worker plant affordability. */
  syncAutoFarmEconomy(opts: {
    autoSeedTier?: SeedTierId;
    hypeBalance?: number;
    workerUpgradeBonus?: number;
  }) {
    if (opts.autoSeedTier) this.cfg.autoSeedTier = opts.autoSeedTier;
    if (opts.hypeBalance != null) this.cfg.hypeBalance = opts.hypeBalance;
    if (opts.workerUpgradeBonus != null) this.cfg.workerUpgradeBonus = opts.workerUpgradeBonus;
    this.reassignWorkerPlots();
  }

  private assignmentFor(workerId: string): string[] {
    const bonus =
      this.cfg.workerUpgradeBonus ??
      coverageUpgradeBonus({
        sweep_speed: 0,
        yield_bonus: 0,
      });
    const workers = (this.cfg.workers ?? []).map((w) => ({
      id: w.id,
      level: w.level,
      deployed: w.deployed,
    }));
    const plotIds = (this.cfg.plots ?? []).map((p) => p.id);
    const map = assignPlotsToWorkers(plotIds, workers, bonus);
    return map.get(workerId) ?? [];
  }

  private reassignWorkerPlots() {
    for (const rt of this.workerRuntimes.values()) {
      rt.assignedPlotIds = this.assignmentFor(rt.id);
      if (rt.targetPlotId && !rt.assignedPlotIds.includes(rt.targetPlotId)) {
        rt.targetPlotId = null;
        rt.task = "idle";
        rt.pendingAction = false;
      }
    }
  }

  private refreshWorkerHud(rt: WorkerRuntime) {
    rt.levelText.setText(`Lv${rt.level}`);
    rt.rateText.setText(`${rt.rate.toFixed(2)}/s`);
    rt.rateText.setColor(rt.level >= 5 ? "#ffe08a" : "#3dff7a");
    rt.levelText.setColor(rt.level >= 8 ? "#ffd24a" : "#ffe08a");
    rt.waitMark.setVisible(rt.task === "wait");
  }

  private spawnWorkerHypeFloat(rt: WorkerRuntime) {
    const chip = this.add
      .text(rt.root.x + Phaser.Math.Between(-6, 6), rt.root.y - 40, `+${rt.rate.toFixed(2)}`, {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#3dff7a",
        stroke: "#06140c",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(depthFromY(rt.root.y) + 20);
    this.tweens.add({
      targets: chip,
      y: chip.y - 18,
      alpha: 0,
      duration: 900,
      ease: "Sine.easeOut",
      onComplete: () => chip.destroy(),
    });
  }

  private workerSpeedForLevel(level: number): number {
    return 28 + Math.min(22, (level - 1) * 2);
  }

  private applyWorkerLook(rt: WorkerRuntime) {
    const tint = WORKER_SPRITE_TINT[rt.speciesId] ?? 0xffffff;
    const scale = 0.95 + Math.min(0.35, (rt.level - 1) * 0.04);
    rt.sprite.setScale(scale);
    rt.sprite.clearTint();
    if (rt.level >= 8) {
      rt.sprite.setTint(0xffe08a);
    } else if (tint !== 0xffffff) {
      rt.sprite.setTint(tint);
    }
  }

  private ensureWorkerAnims() {
    if (this.workerAnimsReady) return;
    const dirs: AnimalDir[] = ["down", "left", "right", "up"];
    const walkKey = "farmer_walk";
    if (this.textures.exists(walkKey)) {
      const cols = 3;
      dirs.forEach((dir, row) => {
        const walkAnim = `${walkKey}_walk_${dir}`;
        if (!this.anims.exists(walkAnim)) {
          this.anims.create({
            key: walkAnim,
            frames: this.anims.generateFrameNumbers(walkKey, {
              frames: [0, 1, 2, 1].map((c) => row * cols + c),
            }),
            frameRate: 6,
            repeat: -1,
          });
        }
        const idleAnim = `${walkKey}_idle_${dir}`;
        if (!this.anims.exists(idleAnim)) {
          this.anims.create({
            key: idleAnim,
            frames: [{ key: walkKey, frame: row * cols }],
            frameRate: 1,
          });
        }
      });
    }
    const plowKey = "farmer_plow";
    if (this.textures.exists(plowKey)) {
      const cols = 3;
      dirs.forEach((dir, row) => {
        const plowAnim = `${plowKey}_${dir}`;
        if (!this.anims.exists(plowAnim)) {
          this.anims.create({
            key: plowAnim,
            frames: this.anims.generateFrameNumbers(plowKey, {
              frames: [0, 1, 2].map((c) => row * cols + c),
            }),
            frameRate: 5,
            repeat: 1,
          });
        }
      });
    }
    this.workerAnimsReady = true;
  }

  private playWorkerAnim(rt: WorkerRuntime) {
    if (rt.plowing || rt.task === "plant" || rt.task === "harvest") {
      const plowKey = `farmer_plow_${rt.dir}`;
      if (this.anims.exists(plowKey) && rt.sprite.anims.currentAnim?.key !== plowKey) {
        rt.sprite.setTexture("farmer_plow", 0);
        rt.sprite.play(plowKey);
      }
      return;
    }
    const base = "farmer_walk";
    if (rt.sprite.texture.key !== base) {
      rt.sprite.setTexture(base, 0);
    }
    const key = rt.walking ? `${base}_walk_${rt.dir}` : `${base}_idle_${rt.dir}`;
    if (this.anims.exists(key) && rt.sprite.anims.currentAnim?.key !== key) {
      rt.sprite.play(key);
    }
  }

  private nearSoilEdge(x: number, y: number): boolean {
    const gx = Math.floor(x / TILE_SIZE);
    const gy = Math.floor(y / TILE_SIZE);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (this.soilBlocked.has(`${gx + dx},${gy + dy}`)) return true;
      }
    }
    return false;
  }

  /** Slightly wider than animal yard — workers patrol the dirt around plots. */
  private workerYardBounds() {
    const b = this.animalYardBounds();
    return {
      minX: b.minX - 0.6 * TILE_SIZE,
      maxX: b.maxX + 0.6 * TILE_SIZE,
      minY: b.minY - 0.4 * TILE_SIZE,
      maxY: b.maxY + 0.5 * TILE_SIZE,
    };
  }

  private isBlockedWorkerPos(x: number, y: number, allowSoil = false): boolean {
    const gx = Math.floor(x / TILE_SIZE);
    const gy = Math.floor(y / TILE_SIZE);
    if (!allowSoil && this.soilBlocked.has(`${gx},${gy}`)) return true;
    const b = this.workerYardBounds();
    // Allow a little deeper into soil beds when approaching a plot
    if (allowSoil) {
      return (
        x < b.minX - TILE_SIZE ||
        x > b.maxX + TILE_SIZE ||
        y < b.minY - TILE_SIZE ||
        y > b.maxY + TILE_SIZE
      );
    }
    return x < b.minX || x > b.maxX || y < b.minY || y > b.maxY;
  }

  private plotWorldPos(plotId: string): { x: number; y: number } | null {
    const plot = this.cfg.plots.find((p) => p.id === plotId);
    if (!plot) return null;
    return gridToScreen(plot.gridX, plot.gridY);
  }

  private autoSeedAffordable(): boolean {
    const tier = (this.cfg.autoSeedTier ?? "Basic") as SeedTierId;
    const def = SEED_DEFS[tier];
    if (!def) return false;
    if ((this.cfg.farmLevel ?? 1) < def.unlockLevel) return false;
    return (this.cfg.hypeBalance ?? 0) >= def.hypeCost;
  }

  private pickWorkerJob(rt: WorkerRuntime): { plotId: string; kind: "harvest" | "plant" } | null {
    const assigned = rt.assignedPlotIds;
    if (!assigned.length) return null;
    const ready = this.cfg.plots.find(
      (p) =>
        assigned.includes(p.id) &&
        (p.status === "ready" || p.status === "blighted") &&
        p.seedTier,
    );
    if (ready) return { plotId: ready.id, kind: "harvest" };
    if (!this.autoSeedAffordable()) return null;
    const empty = this.cfg.plots.find(
      (p) => assigned.includes(p.id) && (p.status === "empty" || !p.seedTier),
    );
    if (empty) return { plotId: empty.id, kind: "plant" };
    return null;
  }

  private faceToward(rt: WorkerRuntime, tx: number, ty: number) {
    const dx = tx - rt.root.x;
    const dy = ty - rt.root.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      rt.dir = dx >= 0 ? "right" : "left";
    } else {
      rt.dir = dy >= 0 ? "down" : "up";
    }
  }

  private beginWorkerAction(rt: WorkerRuntime, kind: "plant" | "harvest") {
    const plotId = rt.targetPlotId;
    if (!plotId || rt.pendingAction) return;
    const plot = this.cfg.plots.find((p) => p.id === plotId);
    if (!plot) {
      rt.task = "idle";
      rt.targetPlotId = null;
      return;
    }
    rt.task = kind;
    rt.walking = false;
    rt.plowing = true;
    rt.pendingAction = true;
    rt.stateUntil = this.time.now + 700;
    this.playWorkerAnim(rt);

    this.time.delayedCall(650, () => {
      if (!this.workerRuntimes.has(rt.id)) return;
      rt.plowing = false;
      const live = this.cfg.plots.find((p) => p.id === plotId) ?? plot;
      if (kind === "harvest") {
        const snapshot: ScenePlot = { ...live };
        // Optimistic clear so AI doesn't re-harvest before refresh
        live.seedTier = null;
        live.plantedAt = null;
        live.maturesAt = null;
        live.status = "empty";
        this.cfg.onWorkerHarvest?.(snapshot, rt.id);
      } else {
        const tier = (this.cfg.autoSeedTier ?? "Basic") as SeedTierId;
        const def = SEED_DEFS[tier];
        const nowIso = new Date().toISOString();
        live.seedTier = tier;
        live.plantedAt = nowIso;
        live.maturesAt = new Date(Date.now() + (def?.demoGrowMs ?? 12_000)).toISOString();
        live.status = "growing";
        this.cfg.onWorkerPlant?.(live, rt.id, tier);
        const cost = def?.hypeCost ?? 0;
        this.cfg.hypeBalance = Math.max(0, (this.cfg.hypeBalance ?? 0) - cost);
      }
      rt.pendingAction = false;
      rt.targetPlotId = null;
      rt.task = "idle";
      rt.stateUntil = this.time.now + 400;
      this.playWorkerAnim(rt);
      this.refreshWorkerHud(rt);
    });
  }

  private tickWorkers(delta: number) {
    if (this.workerRuntimes.size === 0) return;
    const now = this.time.now;
    const dt = Math.min(0.05, delta / 1000);
    const dirs: AnimalDir[] = ["down", "left", "right", "up"];
    const vel: Record<AnimalDir, { x: number; y: number }> = {
      down: { x: 0, y: 1 },
      up: { x: 0, y: -1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };

    for (const rt of this.workerRuntimes.values()) {
      if (now >= rt.nextFloatAt && rt.task !== "plant" && rt.task !== "harvest") {
        this.spawnWorkerHypeFloat(rt);
        const gap = Math.max(700, 2200 - rt.level * 120 - rt.rate * 400);
        rt.nextFloatAt = now + gap + Phaser.Math.Between(0, 400);
      }

      // Mid plant/harvest anim
      if (rt.pendingAction || rt.task === "plant" || rt.task === "harvest") {
        this.refreshWorkerHud(rt);
        continue;
      }

      // Walking to a plot
      if (rt.task === "walk" && rt.targetPlotId) {
        const pos = this.plotWorldPos(rt.targetPlotId);
        if (!pos) {
          rt.task = "idle";
          rt.targetPlotId = null;
          continue;
        }
        const dx = pos.x - rt.root.x;
        const dy = pos.y - 6 - rt.root.y;
        const dist = Math.hypot(dx, dy);
        if (dist < TILE_SIZE * 0.4) {
          const plot = this.cfg.plots.find((p) => p.id === rt.targetPlotId);
          if (!plot) {
            rt.task = "idle";
            rt.targetPlotId = null;
            continue;
          }
          if (plot.status === "ready" || plot.status === "blighted") {
            this.beginWorkerAction(rt, "harvest");
          } else if (plot.status === "empty" || !plot.seedTier) {
            if (this.autoSeedAffordable()) this.beginWorkerAction(rt, "plant");
            else {
              rt.task = "wait";
              rt.walking = false;
              rt.stateUntil = now + 1200;
              this.playWorkerAnim(rt);
              this.refreshWorkerHud(rt);
            }
          } else {
            rt.task = "idle";
            rt.targetPlotId = null;
          }
          continue;
        }
        this.faceToward(rt, pos.x, pos.y);
        rt.walking = true;
        const step = rt.speed * 1.35 * dt;
        const nx = rt.root.x + (dx / dist) * step;
        const ny = rt.root.y + (dy / dist) * step;
        if (!this.isBlockedWorkerPos(nx, ny, true)) {
          rt.root.setPosition(nx, ny);
          rt.root.setDepth(depthFromY(ny));
        }
        this.playWorkerAnim(rt);
        continue;
      }

      if (now < rt.stateUntil) {
        if (rt.task === "wait") {
          this.refreshWorkerHud(rt);
          continue;
        }
        if (rt.plowing || !rt.walking) continue;
        const v = vel[rt.dir];
        const nx = rt.root.x + v.x * rt.speed * dt;
        const ny = rt.root.y + v.y * rt.speed * dt;
        if (this.isBlockedWorkerPos(nx, ny)) {
          rt.walking = false;
          rt.stateUntil = now + Phaser.Math.Between(400, 900);
          this.playWorkerAnim(rt);
        } else {
          rt.root.setPosition(nx, ny);
          rt.root.setDepth(depthFromY(ny));
        }
        continue;
      }

      // Pick next job or wander / wait
      const job = this.pickWorkerJob(rt);
      if (job) {
        rt.task = "walk";
        rt.targetPlotId = job.plotId;
        rt.walking = true;
        rt.plowing = false;
        rt.stateUntil = now + 8000;
        this.refreshWorkerHud(rt);
        this.playWorkerAnim(rt);
        continue;
      }

      if (rt.assignedPlotIds.length > 0 && !this.autoSeedAffordable()) {
        const hasEmpty = this.cfg.plots.some(
          (p) =>
            rt.assignedPlotIds.includes(p.id) && (p.status === "empty" || !p.seedTier),
        );
        if (hasEmpty) {
          rt.task = "wait";
          rt.walking = false;
          rt.targetPlotId = null;
          rt.stateUntil = now + Phaser.Math.Between(900, 1600);
          this.playWorkerAnim(rt);
          this.refreshWorkerHud(rt);
          continue;
        }
      }

      // Wander / tend
      rt.task = "idle";
      rt.targetPlotId = null;
      rt.waitMark.setVisible(false);
      if (rt.plowing) {
        rt.plowing = false;
        rt.walking = false;
        rt.stateUntil = now + Phaser.Math.Between(500, 1100);
        this.playWorkerAnim(rt);
        continue;
      }
      const tryPlow =
        this.textures.exists("farmer_plow") &&
        this.nearSoilEdge(rt.root.x, rt.root.y) &&
        Math.random() < 0.12;
      if (tryPlow) {
        rt.plowing = true;
        rt.walking = false;
        rt.stateUntil = now + 900;
        this.playWorkerAnim(rt);
        continue;
      }
      rt.walking = Math.random() > 0.38;
      rt.dir = dirs[Phaser.Math.Between(0, 3)]!;
      rt.stateUntil =
        now + (rt.walking ? Phaser.Math.Between(900, 2400) : Phaser.Math.Between(600, 1600));
      this.playWorkerAnim(rt);
    }
  }

  private ensureAnimalAnims() {
    if (this.animalAnimsReady) return;
    const dirs: AnimalDir[] = ["down", "left", "right", "up"];
    for (const sp of Object.values(ANIMAL_SPECIES)) {
      const key = `animal_${sp.id}`;
      if (!this.textures.exists(key)) continue;
      const cols = 3;
      dirs.forEach((dir, row) => {
        const walkKey = `${key}_walk_${dir}`;
        if (!this.anims.exists(walkKey)) {
          this.anims.create({
            key: walkKey,
            frames: this.anims.generateFrameNumbers(key, {
              frames: [0, 1, 2, 1].map((c) => row * cols + c),
            }),
            frameRate: 5,
            repeat: -1,
          });
        }
        const idleKey = `${key}_idle_${dir}`;
        if (!this.anims.exists(idleKey)) {
          this.anims.create({
            key: idleKey,
            frames: [{ key, frame: row * cols }],
            frameRate: 1,
          });
        }
      });
    }
    this.animalAnimsReady = true;
  }

  /** Dirt yard around the field — keep off soil tiles. */
  private animalYardBounds() {
    return {
      minX: 18.2 * TILE_SIZE,
      maxX: 28.6 * TILE_SIZE,
      minY: 16.4 * TILE_SIZE,
      maxY: 25.4 * TILE_SIZE,
    };
  }

  private isBlockedAnimalPos(x: number, y: number): boolean {
    const gx = Math.floor(x / TILE_SIZE);
    const gy = Math.floor(y / TILE_SIZE);
    if (this.soilBlocked.has(`${gx},${gy}`)) return true;
    const b = this.animalYardBounds();
    return x < b.minX || x > b.maxX || y < b.minY || y > b.maxY;
  }

  private randomYardFeet(index: number): { x: number; y: number } {
    const spots = [
      { x: 20.5, y: 19.2 },
      { x: 25.8, y: 19.4 },
      { x: 21.2, y: 23.4 },
      { x: 25.5, y: 23.6 },
      { x: 19.4, y: 21.5 },
      { x: 26.8, y: 21.2 },
      { x: 22.0, y: 24.5 },
      { x: 24.5, y: 24.4 },
    ];
    const s = spots[index % spots.length]!;
    const jitter = ((index * 17) % 7) - 3;
    return {
      x: s.x * TILE_SIZE + jitter,
      y: s.y * TILE_SIZE + ((index * 11) % 5) - 2,
    };
  }

  private playAnimalAnim(rt: AnimalRuntime) {
    const base = `animal_${rt.speciesId}`;
    const key = rt.walking ? `${base}_walk_${rt.dir}` : `${base}_idle_${rt.dir}`;
    if (this.anims.exists(key) && rt.sprite.anims.currentAnim?.key !== key) {
      rt.sprite.play(key);
    }
  }

  syncAnimals(animals: OwnedAnimal[]) {
    this.cfg.animals = animals;
    if (!this.ready && this.animalRuntimes.size === 0 && animals.length === 0) return;
    this.ensureAnimalAnims();

    const keep = new Set(animals.map((a) => a.id));
    for (const [id, rt] of this.animalRuntimes) {
      if (!keep.has(id)) {
        rt.sprite.destroy();
        this.animalRuntimes.delete(id);
      }
    }

    animals.forEach((a, i) => {
      if (this.animalRuntimes.has(a.id)) return;
      const tex = `animal_${a.speciesId}`;
      if (!this.textures.exists(tex)) return;
      const feet = this.randomYardFeet(i + this.animalRuntimes.size);
      const spr = this.add
        .sprite(feet.x, feet.y, tex, 0)
        .setOrigin(0.5, 1)
        .setDepth(depthFromY(feet.y));
      const scale = ANIMAL_SPECIES[a.speciesId]?.frameSize === 48 ? 0.85 : 1.05;
      spr.setScale(scale);
      const rt: AnimalRuntime = {
        id: a.id,
        speciesId: a.speciesId,
        sprite: spr,
        dir: "down",
        walking: false,
        stateUntil: this.time.now + 800 + i * 200,
        speed: 14 + (i % 5),
      };
      this.playAnimalAnim(rt);
      this.animalRuntimes.set(a.id, rt);
    });
  }

  private tickAnimals(delta: number) {
    if (this.animalRuntimes.size === 0) return;
    const now = this.time.now;
    const dt = Math.min(0.05, delta / 1000);
    const dirs: AnimalDir[] = ["down", "left", "right", "up"];
    const vel: Record<AnimalDir, { x: number; y: number }> = {
      down: { x: 0, y: 1 },
      up: { x: 0, y: -1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };

    for (const rt of this.animalRuntimes.values()) {
      if (now >= rt.stateUntil) {
        rt.walking = Math.random() > 0.42;
        rt.dir = dirs[Phaser.Math.Between(0, 3)]!;
        rt.stateUntil = now + (rt.walking ? Phaser.Math.Between(900, 2200) : Phaser.Math.Between(700, 1800));
        this.playAnimalAnim(rt);
      }

      if (rt.walking) {
        const v = vel[rt.dir];
        const nx = rt.sprite.x + v.x * rt.speed * dt;
        const ny = rt.sprite.y + v.y * rt.speed * dt;
        if (this.isBlockedAnimalPos(nx, ny)) {
          rt.walking = false;
          rt.stateUntil = now + Phaser.Math.Between(400, 900);
          this.playAnimalAnim(rt);
        } else {
          rt.sprite.setPosition(nx, ny);
          rt.sprite.setDepth(depthFromY(ny));
        }
      }
    }
  }

  private warnIfFlatCrop(frame: number, tier: string | null) {
    if (process.env.NODE_ENV === "production") return;
    const key = `${tier}:${frame}`;
    if (this.flatWarned.has(key)) return;
    try {
      const tex = this.textures.get(CROP_SHEET.key);
      const src = tex.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const cols = CROP_SHEET.columns;
      const sx = (frame % cols) * 32;
      const sy = Math.floor(frame / cols) * 32;
      ctx.drawImage(src as CanvasImageSource, sx, sy, 32, 32, 0, 0, 32, 32);
      const data = ctx.getImageData(0, 0, 32, 32).data;
      if (isFlatFramePixels(data)) {
        this.flatWarned.add(key);
        console.warn(
          `crop frame looks empty/flat — check CROP_FRAMES index for ${tier ?? "?"} frame=${frame}`,
        );
      }
    } catch {
      /* ignore canvas sampling failures */
    }
  }

  private redrawPlots(plots: ScenePlot[]) {
    for (const [, spr] of this.plotSprites) spr.destroy();
    this.plotSprites.clear();
    for (const [, bed] of this.plotBeds) bed.destroy();
    this.plotBeds.clear();
    for (const [, hint] of this.plotHints) hint.destroy();
    this.plotHints.clear();
    for (const [, hit] of this.plotHits) hit.destroy();
    this.plotHits.clear();

    const now = Date.now();
    const byCell = new Map(plots.map((p) => [`${p.gridX},${p.gridY}`, p]));

    for (const cell of soilCells()) {
      const plot = byCell.get(`${cell.gridX},${cell.gridY}`);
      if (!plot) continue;
      const stage = growthStage(plot, now);
      const { x, y } = gridToScreen(cell.gridX, cell.gridY);

      const bedKey =
        stage >= 0 && this.textures.exists("plot_soil_wet") ? "plot_soil_wet" : "plot_soil";
      if (this.textures.exists(bedKey)) {
        const bed = this.add.image(x, y, bedKey).setOrigin(0.5, 0.5).setDepth(5);
        this.plotBeds.set(plot.id, bed);
      }

      const hit = this.add.zone(x, y, TILE_SIZE, TILE_SIZE).setDepth(40);
      hit.setInteractive({ useHandCursor: true });
      hit.on("pointerup", () => {
        if (this.didDragGesture()) return;
        this.cfg.onPlotTap(plot);
      });
      this.plotHits.set(plot.id, hit);

      if (stage < 0) {
        // Empty tilled bed: soft pulse so plantable plots read clearly
        const hint = this.add
          .rectangle(x, y, TILE_SIZE - 4, TILE_SIZE - 4)
          .setStrokeStyle(1, 0xffe08a, 0.85)
          .setFillStyle(0xffe08a, 0.06)
          .setDepth(6);
        this.tweens.add({
          targets: hint,
          alpha: { from: 0.35, to: 1 },
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
        this.plotHints.set(plot.id, hint);
        continue;
      }

      const stageIdx = stage as 0 | 1 | 2 | 3;
      const frame = cropFrameForTier(plot.seedTier, stageIdx);
      this.warnIfFlatCrop(frame, plot.seedTier);
      const crop = this.add
        .image(x, y + TILE_SIZE / 2 - 1, CROP_SHEET.key, frame)
        .setOrigin(0.5, 1)
        .setScale(stageIdx === 0 ? 1.15 : 1.25);
      crop.setDepth(depthFromY(y + 10));

      if (plot.status === "ready" || this.cfg.tutorialInstantReadyPlotId === plot.id) {
        this.tweens.add({
          targets: crop,
          scale: { from: 1.2, to: 1.32 },
          yoyo: true,
          repeat: -1,
          duration: 480,
          ease: "Sine.easeInOut",
        });
      } else {
        // Ambient rustle
        this.tweens.add({
          targets: crop,
          angle: { from: -2, to: 2 },
          duration: 1400 + (cell.gridX + cell.gridY) * 40,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
      this.plotSprites.set(plot.id, crop);
    }
  }
}
