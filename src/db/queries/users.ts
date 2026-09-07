import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import type { UserTx } from "@/db/user-db";

/** Creates the application user row on first authenticated access (idempotent). */
export async function ensureUserRecord(
  tx: UserTx,
  user: { id: string; email: string },
): Promise<void> {
  await tx
    .insert(users)
    .values({ id: user.id, email: user.email })
    .onConflictDoUpdate({ target: users.id, set: { email: user.email, updatedAt: new Date() } });
}

export async function findUserById(tx: UserTx, id: string) {
  const rows = await tx.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}
