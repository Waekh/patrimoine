"use client";

import type { ClientAssetManifest } from "@/game/assets/texture-loader";
import type { WorldState } from "@/types/world";
import { WorldCanvas } from "./world-canvas";

const noop = () => {};

/**
 * Illustrative landscape for the public home page. It reuses the world engine
 * so the page shows the real product, but takes no interaction: the page stays
 * scrollable and readable if the engine cannot start.
 */
export function WorldShowcase({
  world,
  manifest,
}: {
  world: WorldState;
  manifest: ClientAssetManifest;
}) {
  return (
    <WorldCanvas
      world={world}
      manifest={manifest}
      selectedBuildingId={null}
      onSelect={noop}
      onReady={noop}
      animateOnMount
      decorative
      fitToViewport={false}
    />
  );
}
