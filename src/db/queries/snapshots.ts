import { and, desc, eq, gte } from "drizzle-orm";
import { portfolioSnapshots } from "@/db/schema";
import type { UserTx } from "@/db/user-db";
import type { CurrencyCode } from "@/config/currencies";
import type { PortfolioSnapshot } from "@/types/domain";

export interface SnapshotValues {
  currency: CurrencyCode;
  grossAssetsCents: number;
  liabilitiesCents: number;
  netWorthCents: number;
}

/** One row per user and day; a later write the same day replaces the earlier one. */
export async function upsertSnapshot(
  tx: UserTx,
  userId: string,
  date: string,
  values: SnapshotValues,
): Promise<PortfolioSnapshot> {
  const rows = await tx
    .insert(portfolioSnapshots)
    .values({ userId, date, ...values })
    .onConflictDoUpdate({
      target: [portfolioSnapshots.userId, portfolioSnapshots.date],
      set: { ...values, createdAt: new Date() },
    })
    .returning();
  const row = rows[0];
  if (!row) throw new Error("Insertion du relevé refusée.");
  return row;
}

export async function listSnapshots(
  tx: UserTx,
  userId: string,
  limit = 365,
): Promise<PortfolioSnapshot[]> {
  return tx
    .select()
    .from(portfolioSnapshots)
    .where(eq(portfolioSnapshots.userId, userId))
    .orderBy(desc(portfolioSnapshots.date))
    .limit(limit);
}

export async function listSnapshotsSince(
  tx: UserTx,
  userId: string,
  sinceDate: string,
): Promise<PortfolioSnapshot[]> {
  return tx
    .select()
    .from(portfolioSnapshots)
    .where(and(eq(portfolioSnapshots.userId, userId), gte(portfolioSnapshots.date, sinceDate)))
    .orderBy(desc(portfolioSnapshots.date));
}
