"use client";

import { Icons } from "@/components/ui/icons";
import { formatCurrency } from "@/lib/formatting";
import { messages, t } from "@/lib/i18n";
import type { WorldResources } from "@/types/world";
import type { WorldControls } from "./world-canvas";

export function WorldHud({
  resources,
  controls,
  deltaBps,
  showSigns,
  onToggleSigns,
}: {
  resources: WorldResources;
  controls: WorldControls | null;
  deltaBps: number | null;
  showSigns: boolean;
  onToggleSigns: (value: boolean) => void;
}) {
  const money = { amountCents: resources.netWorthCents, currency: resources.currency };
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-md border-2 border-ink bg-surface text-fg hover:bg-surface-2 disabled:opacity-50 hard-shadow pressable";
  return (
    <>
      <div className="border-border bg-surface/95 pointer-events-none absolute top-3 left-3 flex flex-col gap-1 rounded-md border px-4 py-3">
        <span className="text-fg-muted text-[11px] font-medium tracking-wide uppercase">
          {t("wealth.netWorth")}
        </span>
        <span className="tabular font-mono text-xl font-semibold">{formatCurrency(money)}</span>
        <span className="text-fg-muted text-xs">
          {messages.world.levels[resources.worldLevel]}
          {deltaBps != null ? (
            <span
              className={`tabular ml-2 font-mono ${deltaBps > 0 ? "text-positive" : deltaBps < 0 ? "text-negative" : ""}`}
            >
              {deltaBps > 0 ? "+" : ""}
              {(deltaBps / 100).toFixed(2).replace(".", ",")} %
            </span>
          ) : null}
        </span>
      </div>
      {/* Bottom right with the camera controls: the top right is taken by the
          demonstration banner, which was covering this switch entirely. */}
      <label className="border-ink bg-surface/95 absolute right-3 bottom-32 flex cursor-pointer items-center gap-2 rounded-md border-2 px-3 py-2 text-xs font-medium select-none">
        <input
          type="checkbox"
          className="sr-only"
          checked={!showSigns}
          onChange={(e) => onToggleSigns(!e.target.checked)}
        />
        {/*
          Switch drawn as two blocks with no rounding, the same language as the
          map. The knob is positioned from React state rather than a `peer`
          variant: the knob is a child of the track, not a sibling of the input,
          so the CSS variant would never reach it.
        */}
        <span
          aria-hidden="true"
          className={`border-ink relative block h-4 w-8 border-2 transition-colors ${
            showSigns ? "bg-surface-2" : "bg-accent"
          }`}
        >
          <span
            // Light knob once the track turns accent green: a dark one on dark
            // green was barely visible.
            className={`absolute top-0 block h-3 w-3 transition-[left] ${
              showSigns ? "bg-ink left-0" : "bg-surface left-4"
            }`}
          />
        </span>
        {t("world.hideSigns")}
      </label>
      <div
        className="absolute right-3 bottom-3 flex flex-col gap-2"
        role="group"
        aria-label="Caméra"
      >
        <button
          type="button"
          className={btn}
          onClick={() => controls?.zoomIn()}
          disabled={!controls}
          aria-label={t("world.zoomIn")}
        >
          <Icons.plus size={16} />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => controls?.zoomOut()}
          disabled={!controls}
          aria-label={t("world.zoomOut")}
        >
          <Icons.minus size={16} />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => controls?.center()}
          disabled={!controls}
          aria-label={t("world.center")}
        >
          <Icons.target size={16} />
        </button>
      </div>
    </>
  );
}
