import { PIXEL_PALETTE } from "@/config/pixel-palette";
import { t } from "@/lib/i18n";

/**
 * Wordmark with the little house of the world, drawn as flat polygons on the
 * same 2:1 isometric grid as the sprites and in the same palette. It is the
 * shape used for the favicon too (`src/app/icon.png`).
 */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        aria-hidden="true"
        shapeRendering="crispEdges"
      >
        {/* Walls: left face lit, right face in shadow. */}
        <path d="M2 11 L11 16 L11 21 L2 16 Z" fill={PIXEL_PALETTE.wall} />
        <path d="M20 11 L11 16 L11 21 L20 16 Z" fill={PIXEL_PALETTE.wallDark} />
        {/* Hip roof, right slope darker, over a 1 px outline. */}
        <path d="M11 2 L21 8 L11 14 L1 8 Z" fill={PIXEL_PALETTE.roof} />
        <path d="M11 2 L21 8 L11 14 Z" fill={PIXEL_PALETTE.roofDark} />
        {/* Door and a lit window. */}
        <path d="M8 15 L10 16 L10 20 L8 19 Z" fill={PIXEL_PALETTE.wood} />
        <path d="M14 15 L16 14 L16 17 L14 18 Z" fill={PIXEL_PALETTE.windowLit} />
      </svg>
      {compact ? null : <span>{t("app.name")}</span>}
    </span>
  );
}
