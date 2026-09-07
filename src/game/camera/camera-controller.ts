import type { Container, FederatedPointerEvent } from "pixi.js";
import { footprintCenter, gridToScreen, type IsoGridConfig } from "@/game/map/iso";
import type { GridPosition } from "@/types/world";

export const ZOOM_LEVELS = [0.5, 1, 2, 3] as const;

export interface CameraOptions {
  grid: IsoGridConfig;
  viewport: () => { width: number; height: number };
  reducedMotion: () => boolean;
  onZoom?: (zoom: number) => void;
}

/**
 * CameraController: integer zoom steps keep pixels crisp; panning snaps the
 * world container to whole pixels. Short eased moves (≤ 220 ms), never lazy.
 */
export class CameraController {
  private zoomIndex = 1;
  private target: { x: number; y: number } | null = null;
  private dragging: {
    pointerId: number;
    startX: number;
    startY: number;
    worldX: number;
    worldY: number;
  } | null = null;
  private pinch: { distance: number; zoomIndex: number } | null = null;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  /** Screen area hidden by UI overlays (mobile bottom sheet); focus targets the remaining band. */
  private insetBottom = 0;

  constructor(
    private readonly world: Container,
    private readonly options: CameraOptions,
  ) {}

  setInsetBottom(px: number): void {
    this.insetBottom = Math.max(0, px);
  }

  get zoom(): number {
    return ZOOM_LEVELS[this.zoomIndex] ?? 1;
  }

  zoomIn(): void {
    this.setZoomIndex(this.zoomIndex + 1);
  }

  zoomOut(): void {
    this.setZoomIndex(this.zoomIndex - 1);
  }

  setZoomIndex(index: number, pivot?: { x: number; y: number }): void {
    const next = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, index));
    if (next === this.zoomIndex) return;
    const before = this.zoom;
    this.zoomIndex = next;
    const after = this.zoom;
    const { width, height } = this.options.viewport();
    const px = pivot?.x ?? width / 2;
    const py = pivot?.y ?? height / 2;
    // Keep the point under the pivot fixed on screen.
    this.world.position.set(
      Math.round(px - ((px - this.world.position.x) * after) / before),
      Math.round(py - ((py - this.world.position.y) * after) / before),
    );
    this.world.scale.set(after);
    this.target = null;
    this.options.onZoom?.(after);
  }

  /** Picks the largest zoom step at which the map is at most 1.6x the viewport (panning covers the rest). */
  fitToMap(mapSize: number): void {
    const { width, height } = this.options.viewport();
    const mapWidth = mapSize * this.options.grid.tileWidth;
    const mapHeight = mapSize * this.options.grid.tileHeight;
    let index = 0;
    for (let i = 0; i < ZOOM_LEVELS.length; i += 1) {
      const zoom = ZOOM_LEVELS[i] ?? 1;
      if (mapWidth * zoom <= width * 1.6 && mapHeight * zoom <= height * 1.6) index = i;
    }
    if (index !== this.zoomIndex) {
      this.zoomIndex = index;
      this.world.scale.set(this.zoom);
      this.options.onZoom?.(this.zoom);
    }
  }

  pan(dx: number, dy: number): void {
    this.world.position.set(
      Math.round(this.world.position.x + dx),
      Math.round(this.world.position.y + dy),
    );
    this.target = null;
  }

  /** Centres the camera on a grid position (default: animated). */
  center(gridPos: GridPosition, animate = true): void {
    this.moveTo(gridToScreen(gridPos, this.options.grid), animate);
  }

  focusEntity(position: GridPosition, footprint: { w: number; h: number }, animate = true): void {
    this.moveTo(footprintCenter(position, footprint, this.options.grid), animate);
  }

  private moveTo(worldPoint: { x: number; y: number }, animate: boolean): void {
    const { width, height } = this.options.viewport();
    const targetX = Math.round(width / 2 - worldPoint.x * this.zoom);
    const targetY = Math.round((height - this.insetBottom) / 2 - worldPoint.y * this.zoom);
    if (!animate || this.options.reducedMotion()) {
      this.world.position.set(targetX, targetY);
      this.target = null;
      return;
    }
    this.target = { x: targetX, y: targetY };
  }

  /** Called every frame; eases towards the target then snaps. */
  update(deltaMs: number): void {
    if (!this.target) return;
    const k = Math.min(1, deltaMs / 90);
    const nx = this.world.position.x + (this.target.x - this.world.position.x) * k;
    const ny = this.world.position.y + (this.target.y - this.world.position.y) * k;
    if (Math.abs(this.target.x - nx) < 1 && Math.abs(this.target.y - ny) < 1) {
      this.world.position.set(this.target.x, this.target.y);
      this.target = null;
      return;
    }
    this.world.position.set(Math.round(nx), Math.round(ny));
  }

  onPointerDown(e: FederatedPointerEvent): void {
    this.pointers.set(e.pointerId, { x: e.global.x, y: e.global.y });
    if (this.pointers.size === 1) {
      this.dragging = {
        pointerId: e.pointerId,
        startX: e.global.x,
        startY: e.global.y,
        worldX: this.world.position.x,
        worldY: this.world.position.y,
      };
    } else if (this.pointers.size === 2) {
      this.dragging = null;
      this.pinch = { distance: this.pinchDistance(), zoomIndex: this.zoomIndex };
    }
  }

  /** Returns true while a drag moved far enough to count as panning (suppresses clicks). */
  onPointerMove(e: FederatedPointerEvent): boolean {
    if (!this.pointers.has(e.pointerId)) return false;
    this.pointers.set(e.pointerId, { x: e.global.x, y: e.global.y });
    if (this.pinch && this.pointers.size === 2) {
      const ratio = this.pinchDistance() / this.pinch.distance;
      if (ratio > 1.4) this.setZoomIndex(this.pinch.zoomIndex + 1);
      else if (ratio < 0.7) this.setZoomIndex(this.pinch.zoomIndex - 1);
      return true;
    }
    if (!this.dragging || this.dragging.pointerId !== e.pointerId) return false;
    const dx = e.global.x - this.dragging.startX;
    const dy = e.global.y - this.dragging.startY;
    this.world.position.set(
      Math.round(this.dragging.worldX + dx),
      Math.round(this.dragging.worldY + dy),
    );
    this.target = null;
    return Math.abs(dx) + Math.abs(dy) > 6;
  }

  onPointerUp(e: FederatedPointerEvent): void {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    if (this.dragging?.pointerId === e.pointerId) this.dragging = null;
  }

  onWheel(deltaY: number, pivot: { x: number; y: number }): void {
    this.setZoomIndex(this.zoomIndex + (deltaY < 0 ? 1 : -1), pivot);
  }

  private pinchDistance(): number {
    const [a, b] = [...this.pointers.values()];
    if (!a || !b) return 1;
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  }
}
