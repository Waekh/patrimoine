"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/states";
import type { ClientAssetManifest } from "@/game/assets/texture-loader";
import { t } from "@/lib/i18n";
import type { AssetWithDetails, Liability } from "@/types/domain";
import type { WorldState } from "@/types/world";
import { BuildingDetailPanel } from "./building-detail-panel";
import { BuildingTooltip } from "./building-tooltip";
import { BuildingList } from "./building-list";
import { WorldCanvas, type WorldControls } from "./world-canvas";
import { WorldHud } from "./world-hud";

function subscribeViewport(onChange: () => void): () => void {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

export interface WorldViewProps {
  world: WorldState;
  manifest: ClientAssetManifest;
  assets: AssetWithDetails[];
  liabilities: Liability[];
  deltaBps: number | null;
  animateOnMount: boolean;
  readOnly?: boolean;
  banner?: string;
}

/**
 * Desktop: world + side panel. Mobile: world + bottom sheet. The building list
 * is the accessible, text-only representation of the map.
 */
export function WorldView({
  world,
  manifest,
  assets,
  liabilities,
  deltaBps,
  animateOnMount,
  readOnly = false,
  banner,
}: WorldViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hovered, setHovered] = useState<{
    id: string;
    x: number;
    y: number;
    bounds: { width: number; height: number };
  } | null>(null);
  const [controls, setControls] = useState<WorldControls | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [showSigns, setShowSigns] = useState(true);
  const selected = useMemo(
    () => world.buildings.find((b) => b.id === selectedId) ?? null,
    [world, selectedId],
  );
  const asset = useMemo(
    () => (selected ? (assets.find((a) => a.id === selected.assetId) ?? null) : null),
    [assets, selected],
  );
  const linked = useMemo(
    () => (selected ? liabilities.filter((l) => selected.linkedLiabilityIds.includes(l.id)) : []),
    [liabilities, selected],
  );
  const sectionRef = useRef<HTMLElement>(null);
  const hoveredBuilding = useMemo(
    () => (hovered ? (world.buildings.find((b) => b.id === hovered.id) ?? null) : null),
    [world, hovered],
  );
  // The scene is measured here, in the event handler: the bubble flips against
  // the edge of the scene, and a ref cannot be read while rendering.
  const onHover = useCallback(
    (buildingId: string | null, position: { x: number; y: number } | null) => {
      if (!buildingId || !position) {
        setHovered(null);
        return;
      }
      const scene = sectionRef.current;
      setHovered({
        id: buildingId,
        ...position,
        bounds: { width: scene?.clientWidth ?? 0, height: scene?.clientHeight ?? 0 },
      });
    },
    [],
  );
  // Mobile bottom sheet covers up to 60 % of the scene: focus the building in the visible band.
  const focusInsetBottom = useSyncExternalStore(
    subscribeViewport,
    () =>
      window.matchMedia("(max-width: 767px)").matches && selected
        ? Math.round((sectionRef.current?.clientHeight ?? 0) * 0.6)
        : 0,
    () => 0,
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!controls) return;
      const step = 48;
      if (e.key === "ArrowLeft") controls.pan(step, 0);
      else if (e.key === "ArrowRight") controls.pan(-step, 0);
      else if (e.key === "ArrowUp") controls.pan(0, step);
      else if (e.key === "ArrowDown") controls.pan(0, -step);
      else if (e.key === "+" || e.key === "=") controls.zoomIn();
      else if (e.key === "-") controls.zoomOut();
      else if (e.key === "Escape") setSelectedId(null);
      else return;
      e.preventDefault();
    },
    [controls],
  );

  const empty = world.buildings.length === 0;
  const panel = selected ? (
    <BuildingDetailPanel
      building={selected}
      asset={asset}
      linkedLiabilities={linked}
      onClose={() => setSelectedId(null)}
      readOnly={readOnly}
      className="border-0 md:border"
    />
  ) : null;

  return (
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-[420px] flex-col md:h-screen md:flex-row">
      <section
        ref={sectionRef}
        className="relative min-h-0 flex-1 outline-none"
        tabIndex={0}
        role="application"
        aria-label={t("world.title")}
        aria-describedby="world-help"
        onKeyDown={onKeyDown}
      >
        <p id="world-help" className="sr-only">
          {t("world.selectHint")}
        </p>
        <WorldCanvas
          world={world}
          manifest={manifest}
          selectedBuildingId={selectedId}
          onSelect={setSelectedId}
          onHover={onHover}
          showSigns={showSigns}
          animateOnMount={animateOnMount}
          focusInsetBottom={focusInsetBottom}
          onReady={setControls}
        />
        {hovered && hoveredBuilding ? (
          <BuildingTooltip
            building={hoveredBuilding}
            x={hovered.x}
            y={hovered.y}
            bounds={hovered.bounds}
          />
        ) : null}
        <WorldHud
          resources={world.resources}
          controls={controls}
          deltaBps={deltaBps}
          showSigns={showSigns}
          onToggleSigns={setShowSigns}
        />
        {banner ? (
          <div className="pointer-events-none absolute top-3 right-3 max-w-xs">
            <Notice tone="info">{banner}</Notice>
          </div>
        ) : null}
        {world.usesPlaceholders ? (
          <p className="pointer-events-none absolute bottom-3 left-3 rounded bg-black/40 px-2 py-1 text-[11px] text-white/80">
            {t("world.placeholderNotice")}
          </p>
        ) : null}
        {empty ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div className="border-border bg-surface/95 pointer-events-auto flex max-w-sm flex-col items-center gap-3 rounded-lg border p-6 text-center">
              <p className="font-medium">{t("world.empty")}</p>
              <p className="text-fg-muted text-sm">{t("world.emptyHint")}</p>
              {!readOnly ? (
                <Link href="/assets/new">
                  <Button>{t("assets.add")}</Button>
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
        {/* Mobile bottom sheet */}
        {selected ? (
          <div className="border-border bg-surface absolute inset-x-0 bottom-0 z-20 max-h-[60%] overflow-y-auto rounded-t-lg border-t shadow-[0_-2px_12px_rgba(0,0,0,0.15)] md:hidden">
            {panel}
          </div>
        ) : null}
        {!selected && !empty ? (
          <button
            type="button"
            onClick={() => setListOpen((v) => !v)}
            className="border-border bg-surface absolute bottom-14 left-1/2 -translate-x-1/2 rounded-md border px-3 py-1.5 text-xs md:hidden"
            aria-expanded={listOpen}
          >
            {t("world.buildingsList")}
          </button>
        ) : null}
        {listOpen && !selected ? (
          <div className="border-border bg-surface absolute inset-x-0 bottom-0 z-20 max-h-[50%] overflow-y-auto rounded-t-lg border-t p-3 md:hidden">
            <BuildingList
              buildings={world.buildings}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
                setListOpen(false);
              }}
            />
          </div>
        ) : null}
      </section>
      {/* Desktop side panel */}
      <aside
        className="border-border bg-bg hidden w-[360px] shrink-0 flex-col gap-4 overflow-y-auto border-l p-4 md:flex"
        aria-label={t("world.selectHint")}
      >
        {panel ?? (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">{t("world.buildingsList")}</h2>
            <BuildingList
              buildings={world.buildings}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        )}
      </aside>
    </div>
  );
}
