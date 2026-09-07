import type { UserTx } from "@/db/user-db";
import { upsertSnapshot } from "@/db/queries/snapshots";
import type { WealthSummary } from "./wealth-calculation";

export function todayIsoDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** PortfolioSnapshotService: persists today's summary (idempotent per day). */
export async function recordSnapshot(
  tx: UserTx,
  userId: string,
  summary: WealthSummary,
  now: Date = new Date(),
): Promise<void> {
  await upsertSnapshot(tx, userId, todayIsoDate(now), {
    currency: summary.currency,
    grossAssetsCents: summary.grossAssets.amountCents,
    liabilitiesCents: summary.totalLiabilities.amountCents,
    netWorthCents: summary.netWorth.amountCents,
  });
}
