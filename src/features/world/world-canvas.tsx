"use client";

import { useEffect, useRef, useState } from "react";
import type { WorldApp } from "@/game/engine/world-app";
import type { ClientAssetManifest } from "@/game/assets/texture-loader";
import { t } from "@/lib/i18n";
import type { WorldState } from "@/types/world";

export interface WorldCanvasProps {
  world: WorldState;
  manifest: ClientAssetManifest;
  selectedBuildingId: string | null;
  onSelect: (buildingId: string | null) => void;
  /** Mouse only: the building under the pointer and where the pointer is. */
  onHover?: (buildingId: string | null, position: { x: number; y: number } | null) => void;
  animateOnMount: boolean;
  /** Pixels hidden at the bottom of the canvas by an overlay (mobile bottom sheet). */
  focusInsetBottom?: number;
  /** Exposes camera controls to the HUD once the engine is ready. */
  onReady: (controls: WorldControls | null) => void;
  /**
   * Purely illustrative use (home page): the scene takes no pointer event and
   * shows no loading or error message, since the page reads fine without it.
   */
  decorative?: boolean;
  /** Default true: zoom out until the map fits. False keeps a 1:1 slice. */
  fitToViewport?: boolean;
  /** Default true. Hiding the labels leaves a clear view of the city. */
  showSigns?: boolean;
}

export interface WorldControls {
  zoomIn: () => void;
  zoomOut: () => void;
  center: () => void;
  pan: (dx: number, dy: number) => void;
}

type Status = "loading" | "ready" | "error";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * React <-> PixiJS boundary. The engine is loaded lazily on the client only;
 * this component never renders DOM inside the canvas.
 */
export function WorldCanvas({
  world,
  manifest,
  selectedBuildingId,
  onSelect,
  onHover,
  animateOnMount,
  focusInsetBottom = 0,
  onReady,
  decorative = false,
  fitToViewport = true,
  showSigns = true,
}: WorldCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<WorldApp | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  const worldRef = useRef(world);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onSelectRef.current = onSelect;
    onHoverRef.current = onHover;
    worldRef.current = world;
    onReadyRef.current = onReady;
  }, [onSelect, onHover, world, onReady]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let app: WorldApp | null = null;
    const styles = getComputedStyle(document.documentElement);
    const bg = Number.parseInt(
      (styles.getPropertyValue("--world-bg").trim() || "#1b2a3a").slice(1),
      16,
    );

    (async () => {
      try {
        const { WorldApp: Engine } = await import("@/game/engine/world-app");
        if (cancelled) return;
        app = new Engine({
          container: host,
          manifest,
          backgroundColor: bg,
          reducedMotion: prefersReducedMotion,
          fitToViewport,
        });
        app.events.on("select", ({ buildingId }) => onSelectRef.current(buildingId));
        app.events.on("hover", ({ buildingId, position }) =>
          onHoverRef.current?.(buildingId, position),
        );
        app.events.on("ready", () => {
          if (cancelled || !app) return;
          appRef.current = app;
          app.setWorld(worldRef.current, { animateAll: animateOnMount });
          setStatus("ready");
          onReadyRef.current({
            zoomIn: () => app?.zoomIn(),
            zoomOut: () => app?.zoomOut(),
            center: () => app?.center(),
            pan: (dx, dy) => app?.pan(dx, dy),
          });
        });
        await app.init();
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      onReadyRef.current(null);
      appRef.current = null;
      app?.destroy();
    };
    // The engine is created once per mount; world updates go through setWorld below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifest]);

  useEffect(() => {
    appRef.current?.setWorld(world);
  }, [world]);

  useEffect(() => {
    appRef.current?.setSignsVisible(showSigns);
  }, [showSigns]);

  useEffect(() => {
    appRef.current?.setFocusInsetBottom(focusInsetBottom);
    appRef.current?.select(selectedBuildingId);
  }, [selectedBuildingId, focusInsetBottom]);

  return (
    <div className={`bg-world-bg relative h-full w-full${decorative ? "pointer-events-none" : ""}`}>
      <div ref={hostRef} className="h-full w-full" />
      {status === "loading" && !decorative ? (
        <div
          role="status"
          className="absolute inset-0 flex items-center justify-center text-sm text-white/70"
        >
          {t("world.loading")}
        </div>
      ) : null}
      {status === "error" && !decorative ? (
        <div
          role="alert"
          className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/80"
        >
          {t("world.webglUnavailable")}
        </div>
      ) : null}
    </div>
  );
}
