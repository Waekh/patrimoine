import { ASSET_FAMILIES, type AssetFamily } from "@/config/categories";
import { PIXEL_PALETTE } from "@/config/pixel-palette";
import { formatCurrency, formatPercentage } from "@/lib/formatting";
import { messages } from "@/lib/i18n";
import type { Money } from "@/lib/money";

/**
 * One colour per family, taken from the world palette: each is the tone of the
 * buildings that family raises on the map, so the chart and the city agree.
 * They were hard-coded hex strings, one of which was an accent the palette no
 * longer contains.
 */
const FAMILY_COLORS: Record<AssetFamily, string> = {
  REAL_ESTATE: PIXEL_PALETTE.roof,
  FINANCIAL: PIXEL_PALETTE.glassDark,
  LIQUIDITY: PIXEL_PALETTE.awning,
  ALTERNATIVE: PIXEL_PALETTE.wood,
};

/** Stacked bar + legend; every value is also present as text. */
export function AllocationChart({
  byFamily,
  total,
}: {
  byFamily: Record<AssetFamily, Money>;
  total: Money;
}) {
  const totalCents = total.amountCents;
  const rows = ASSET_FAMILIES.map((family) => {
    const value = byFamily[family];
    const bps = totalCents > 0 ? Math.round((value.amountCents * 10_000) / totalCents) : 0;
    return { family, value, bps };
  }).filter((r) => r.value.amountCents > 0);
  if (rows.length === 0) return <p className="text-fg-muted text-sm">—</p>;
  return (
    <div className="flex flex-col gap-3">
      {/*
        Square-ended and outlined like the rest of the chrome: a pill with
        rounded caps was the last continuous curve left in the interface.
      */}
      <div
        className="bg-surface-2 border-ink flex h-4 w-full overflow-hidden border-2"
        role="img"
        aria-label="Répartition par famille d'actifs"
      >
        {rows.map((r) => (
          <div
            key={r.family}
            style={{ width: `${r.bps / 100}%`, background: FAMILY_COLORS[r.family] }}
          />
        ))}
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.family} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="border-ink inline-block h-3 w-3 border"
                style={{ background: FAMILY_COLORS[r.family] }}
              />
              {messages.wealth.families[r.family]}
            </span>
            <span className="tabular text-fg-muted font-mono">
              {formatCurrency(r.value)} ·{" "}
              {formatPercentage(r.bps, { signed: false, fractionDigits: 1 })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
