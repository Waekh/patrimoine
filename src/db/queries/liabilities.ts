import { and, asc, eq } from "drizzle-orm";
import { liabilities } from "@/db/schema";
import type { UserTx } from "@/db/user-db";
import type { Liability, NewLiability } from "@/types/domain";

export async function listLiabilities(tx: UserTx, userId: string): Promise<Liability[]> {
  return tx
    .select()
    .from(liabilities)
    .where(eq(liabilities.userId, userId))
    .orderBy(asc(liabilities.createdAt), asc(liabilities.id));
}

export async function findLiabilityById(
  tx: UserTx,
  userId: string,
  id: string,
): Promise<Liability | null> {
  const rows = await tx
    .select()
    .from(liabilities)
    .where(and(eq(liabilities.userId, userId), eq(liabilities.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertLiability(tx: UserTx, values: NewLiability): Promise<Liability> {
  const rows = await tx.insert(liabilities).values(values).returning();
  const row = rows[0];
  if (!row) throw new Error("Insertion de la dette refusée.");
  return row;
}

export async function updateLiability(
  tx: UserTx,
  userId: string,
  id: string,
  values: Partial<NewLiability>,
): Promise<Liability | null> {
  const rows = await tx
    .update(liabilities)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(liabilities.userId, userId), eq(liabilities.id, id)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteLiability(tx: UserTx, userId: string, id: string): Promise<boolean> {
  const rows = await tx
    .delete(liabilities)
    .where(and(eq(liabilities.userId, userId), eq(liabilities.id, id)))
    .returning({ id: liabilities.id });
  return rows.length > 0;
}
