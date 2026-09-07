import { t } from "@/lib/i18n";

/** Wordmark with a small isometric cube: the only "brand" graphic. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        aria-hidden="true"
        shapeRendering="crispEdges"
      >
        <path d="M10 1 L19 6 L10 11 L1 6 Z" fill="#7fb069" />
        <path d="M1 6 L10 11 L10 19 L1 14 Z" fill="#1f6f5b" />
        <path d="M19 6 L10 11 L10 19 L19 14 Z" fill="#185a4a" />
      </svg>
      {compact ? null : <span>{t("app.name")}</span>}
    </span>
  );
}
