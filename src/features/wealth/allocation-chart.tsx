import { ASSET_FAMILIES, type AssetFamily } from "@/config/categories";
import { formatCurrency, formatPercentage } from "@/lib/formatting";
import { messages } from "@/lib/i18n";
import type { Money } from "@/lib/money";

const FAMILY_COLORS: Record<AssetFamily, string> = {
  REAL_ESTATE: "#b8433a",
  FINANCIAL: "#4e93a8",
  LIQUIDITY: "#1f6f5b",
  ALTERNATIVE: "#8a6a45",
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
      <div
        className="bg-surface-2 flex h-3 w-full overflow-hidden rounded-full"
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
                className="inline-block h-2.5 w-2.5 rounded-sm"
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
