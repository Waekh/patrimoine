import type { GridPosition } from "@/types/world";

export interface IsoGridConfig {
  tileWidth: number;
  tileHeight: number;
}

export const DEFAULT_ISO_GRID: IsoGridConfig = { tileWidth: 64, tileHeight: 32 };

/** Grid (x right-down, y left-down) -> screen pixels of the tile centre. */
export function gridToScreen(
  pos: GridPosition,
  grid: IsoGridConfig = DEFAULT_ISO_GRID,
): { x: number; y: number } {
  return {
    x: ((pos.x - pos.y) * grid.tileWidth) / 2,
    y: ((pos.x + pos.y) * grid.tileHeight) / 2,
  };
}

/** Screen pixels -> fractional grid coordinates (inverse projection). */
export function screenToGrid(
  point: { x: number; y: number },
  grid: IsoGridConfig = DEFAULT_ISO_GRID,
): { x: number; y: number } {
  const hx = point.x / (grid.tileWidth / 2);
  const hy = point.y / (grid.tileHeight / 2);
  return { x: (hx + hy) / 2, y: (hy - hx) / 2 };
}

/** Screen centre of a footprint (w x h tiles) anchored at its top-left grid cell. */
export function footprintCenter(
  pos: GridPosition,
  footprint: { w: number; h: number },
  grid: IsoGridConfig = DEFAULT_ISO_GRID,
) {
  return gridToScreen({ x: pos.x + (footprint.w - 1) / 2, y: pos.y + (footprint.h - 1) / 2 }, grid);
}
