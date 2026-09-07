import { and, asc, eq } from "drizzle-orm";
import { incomeSources } from "@/db/schema";
import type { UserTx } from "@/db/user-db";
import type { IncomeSource, NewIncomeSource } from "@/types/domain";

export async function listIncomeSources(tx: UserTx, userId: string): Promise<IncomeSource[]> {
  return tx
    .select()
    .from(incomeSources)
    .where(eq(incomeSources.userId, userId))
    .orderBy(asc(incomeSources.createdAt));
}

export async function insertIncomeSource(
  tx: UserTx,
  values: NewIncomeSource,
): Promise<IncomeSource> {
  const rows = await tx.insert(incomeSources).values(values).returning();
  const row = rows[0];
  if (!row) throw new Error("Insertion du revenu refusée.");
  return row;
}

export async function deleteIncomeSource(tx: UserTx, userId: string, id: string): Promise<boolean> {
  const rows = await tx
    .delete(incomeSources)
    .where(and(eq(incomeSources.userId, userId), eq(incomeSources.id, id)))
    .returning({ id: incomeSources.id });
  return rows.length > 0;
}
