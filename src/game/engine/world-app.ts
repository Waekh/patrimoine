import { Application, Container, type FederatedPointerEvent } from "pixi.js";
import { TextureRegistry, type ClientAssetManifest } from "@/game/assets/texture-loader";
import { CameraController } from "@/game/camera/camera-controller";
import {
  createBuildAnimation,
  createUpgradeAnimation,
  updateCharacters,
  type TimedAnimation,
} from "@/game/animation/animations";
import { footprintCenter, type IsoGridConfig } from "@/game/map/iso";
import { buildScene, destroyScene, type Scene } from "@/game/rendering/scene-builder";
import { SPRITE_IDS } from "@/config/sprites";
import type { WorldState } from "@/types/world";
import { WorldEventBus } from "./events";

export interface WorldAppOptions {
  container: HTMLElement;
  manifest: ClientAssetManifest;
  backgroundColor: number;
  reducedMotion: () => boolean;
  /**
   * Zooms out until the whole map fits. Disabled for a decorative scene, where
   * a 1:1 slice keeps the pixels crisp instead of dropping one row in two.
   */
  fitToViewport?: boolean;
}

/**
 * WorldApp owns the PixiJS Application. React talks to it through
 * `setWorld`, `select`, the camera methods and the event bus, nothing else.
 */
export class WorldApp {
  readonly events = new WorldEventBus();
  private app: Application | null = null;
  private world = new Container();
  private scene: Scene | null = null;
  private registry: TextureRegistry;
  private camera: CameraController | null = null;
  private animations: TimedAnimation[] = [];
  private grid: IsoGridConfig;
  private selectedId: string | null = null;
  private previous: WorldState | null = null;
  private suppressNextTap = false;
  private destroyed = false;
  private readonly onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = this.options.container.getBoundingClientRect();
    this.camera?.onWheel(e.deltaY, { x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  constructor(private readonly options: WorldAppOptions) {
    this.registry = new TextureRegistry(options.manifest);
    this.grid = {
      tileWidth: options.manifest.tile.width,
      tileHeight: options.manifest.tile.height,
    };
  }

  async init(): Promise<void> {
    const app = new Application();
    await app.init({
      background: this.options.backgroundColor,
      resizeTo: this.options.container,
      antialias: false,
      roundPixels: true,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      autoDensity: true,
      preference: "webgl",
    });
    if (this.destroyed) {
      app.destroy(true);
      return;
    }
    this.app = app;
    app.canvas.style.display = "block";
    app.canvas.style.touchAction = "none";
    app.canvas.setAttribute("aria-hidden", "true");
    this.options.container.appendChild(app.canvas);
    app.stage.addChild(this.world);
    app.stage.eventMode = "static";
    app.stage.hitArea = app.screen;

    this.camera = new CameraController(this.world, {
      grid: this.grid,
      viewport: () => ({ width: app.screen.width, height: app.screen.height }),
      reducedMotion: this.options.reducedMotion,
      onZoom: (zoom) => this.events.emit("camera", { zoom }),
    });
    app.stage.on("pointerdown", (e: FederatedPointerEvent) => this.camera?.onPointerDown(e));
    app.stage.on("pointermove", (e: FederatedPointerEvent) => {
      if (this.camera?.onPointerMove(e)) this.suppressNextTap = true;
    });
    const up = (e: FederatedPointerEvent) => {
      this.camera?.onPointerUp(e);
      // Reset after the tap event that follows pointerup has been dispatched.
      setTimeout(() => {
        this.suppressNextTap = false;
      }, 0);
    };
    app.stage.on("pointerup", up);
    app.stage.on("pointerupoutside", up);
    app.canvas.addEventListener("wheel", this.onWheel, { passive: false });

    app.ticker.add((ticker) => this.tick(ticker.deltaMS));
    // resizeTo applies on the next frame; measure now so the first camera placement is correct.
    app.resize();
    await this.registry.load();
    this.events.emit("ready", undefined);
  }

  /** Replaces the scene. Buildings that are new or levelled up get an animation. */
  setWorld(state: WorldState, options: { animateAll?: boolean } = {}): void {
    if (!this.app || !this.camera) return;
    const previousBuildings = new Map(this.previous?.buildings.map((b) => [b.id, b]) ?? []);
    if (this.scene) {
      this.world.removeChild(this.scene.root);
      destroyScene(this.scene);
    }
    this.animations = [];
    this.scene = buildScene(state, this.registry, this.grid, {
      onBuildingTap: (id) => {
        if (this.suppressNextTap) return;
        this.select(id, false);
        this.events.emit("select", { buildingId: id });
      },
      onBuildingHover: (id) => this.events.emit("hover", { buildingId: id }),
      onGroundTap: () => {
        if (this.suppressNextTap) return;
        this.select(null, false);
        this.events.emit("select", { buildingId: null });
      },
    });
    this.world.addChild(this.scene.root);

    if (!this.options.reducedMotion()) {
      let index = 0;
      for (const node of this.scene.buildings.values()) {
        const before = previousBuildings.get(node.building.id);
        if (options.animateAll || !before)
          this.animations.push(createBuildAnimation(node, index++));
        else if (before.level < node.building.level)
          this.animations.push(createUpgradeAnimation(node));
      }
    }
    const mapChanged = !this.previous || this.previous.mapSize !== state.mapSize;
    this.previous = state;
    if (mapChanged) {
      if (this.options.fitToViewport !== false) this.camera.fitToMap(state.mapSize);
      this.camera.center(state.camera.center, false);
    }
    if (this.selectedId && !this.scene.buildings.has(this.selectedId)) this.selectedId = null;
    this.applySelection();
  }

  select(buildingId: string | null, focus = true): void {
    this.selectedId = buildingId;
    this.applySelection();
    if (focus && buildingId && this.scene) {
      const node = this.scene.buildings.get(buildingId);
      if (node) this.camera?.focusEntity(node.building.position, node.building.footprint);
    }
  }

  /** Height (px) of any overlay covering the bottom of the canvas, used when focusing. */
  setFocusInsetBottom(px: number): void {
    this.camera?.setInsetBottom(px);
  }

  zoomIn(): void {
    this.camera?.zoomIn();
  }

  zoomOut(): void {
    this.camera?.zoomOut();
  }

  center(): void {
    if (this.previous) this.camera?.center(this.previous.camera.center);
  }

  pan(dx: number, dy: number): void {
    this.camera?.pan(dx, dy);
  }

  get zoom(): number {
    return this.camera?.zoom ?? 1;
  }

  destroy(): void {
    this.destroyed = true;
    this.events.clear();
    if (this.scene) destroyScene(this.scene);
    this.scene = null;
    if (this.app) {
      this.app.canvas.removeEventListener("wheel", this.onWheel);
      this.app.destroy(true, { children: true, texture: false });
      this.app = null;
    }
  }

  private applySelection(): void {
    if (!this.scene) return;
    const node = this.selectedId ? this.scene.buildings.get(this.selectedId) : null;
    const ring = this.scene.selection;
    if (!node) {
      ring.visible = false;
      return;
    }
    const ringId = node.building.footprint.w === 2 ? "selection_ring_2x2" : SPRITE_IDS.selection;
    const entry = this.registry.get(ringId);
    if (entry) {
      ring.texture = entry.texture;
      ring.anchor.set(
        entry.meta.anchor.x / entry.meta.width,
        entry.meta.anchor.y / entry.meta.height,
      );
    }
    const { x, y } = footprintCenter(node.building.position, node.building.footprint, this.grid);
    ring.position.set(x, y);
    ring.zIndex = node.container.zIndex - 1;
    ring.visible = true;
    ring.alpha = 1;
  }

  private tick(deltaMs: number): void {
    this.camera?.update(deltaMs);
    if (this.animations.length) this.animations = this.animations.filter((a) => a.update(deltaMs));
    if (this.scene && !this.options.reducedMotion()) {
      updateCharacters(this.scene.characters, deltaMs, this.grid);
      if (this.scene.selection.visible) {
        this.scene.selection.alpha = 0.7 + 0.3 * Math.sin(performance.now() / 250);
      }
    }
  }
}
