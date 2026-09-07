import type { PortfolioSnapshot } from "@/types/domain";

/**
 * Variation (bps) between the latest snapshot and the previous distinct day.
 * Null when there is no comparison point or the previous net worth is zero.
 */
export function netWorthDeltaBps(snapshotsDesc: readonly PortfolioSnapshot[]): number | null {
  const [latest, previous] = snapshotsDesc;
  if (!latest || !previous || previous.netWorthCents === 0) return null;
  return Math.round(
    ((latest.netWorthCents - previous.netWorthCents) * 10_000) / previous.netWorthCents,
  );
}
