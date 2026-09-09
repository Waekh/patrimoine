"use client";

import { formatCurrency } from "@/lib/formatting";
import { messages } from "@/lib/i18n";
import type { WorldBuilding } from "@/types/world";

/** Distance from the pointer, and the margin kept from the edge of the scene. */
const OFFSET = 16;
const EDGE = 8;
const WIDTH = 216;
const HEIGHT = 96;

/**
 * Where the bubble sits for a pointer at (x, y). It flips to the other side of
 * the pointer near an edge rather than being clamped, which would leave it
 * pinned under the cursor and hide the building it describes.
 */
export function tooltipPosition(
  x: number,
  y: number,
  bounds: { width: number; height: number },
): { left: number; top: number } {
  return {
    left: Math.max(EDGE, x + OFFSET + WIDTH + EDGE > bounds.width ? x - OFFSET - WIDTH : x + OFFSET),
    top: Math.max(EDGE, y + OFFSET + HEIGHT + EDGE > bounds.height ? y - OFFSET - HEIGHT : y + OFFSET),
  };
}

export interface BuildingTooltipProps {
  building: WorldBuilding;
  /** Pointer position, in pixels inside the scene. */
  x: number;
  y: number;
  /** Size of the scene, used to keep the bubble on screen near an edge. */
  bounds: { width: number; height: number };
}

/**
 * The bubble that follows the pointer over a building. It carries the name, the
 * kind of asset and the value — enough to read the map without clicking; the
 * full figures stay in the detail panel.
 *
 * It is decorative: the canvas is hidden from assistive technology and the same
 * content is in the building list, so announcing it twice would only add noise.
 */
export function BuildingTooltip({ building, x, y, bounds }: BuildingTooltipProps) {
  const { left, top } = tooltipPosition(x, y, bounds);
  return (
    <div
      aria-hidden="true"
      className="border-ink bg-surface hard-shadow pointer-events-none absolute z-10 border-2 px-3 py-2"
      style={{ left, top, width: WIDTH }}
    >
      <p className="truncate text-sm font-semibold">{building.label}</p>
      <p className="text-fg-muted truncate text-[11px]">
        {messages.world.buildings[building.type]} ·{" "}
        {messages.assets.categories[building.assetCategory]}
      </p>
      <p className="mt-1 font-semibold tabular-nums">
        {formatCurrency({ amountCents: building.valueCents, currency: building.currency })}
      </p>
    </div>
  );
}
