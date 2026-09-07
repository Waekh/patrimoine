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
}: {
  resources: WorldResources;
  controls: WorldControls | null;
  deltaBps: number | null;
}) {
  const money = { amountCents: resources.netWorthCents, currency: resources.currency };
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-fg hover:bg-surface-2 disabled:opacity-50";
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
