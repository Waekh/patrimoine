import "server-only";
import { sql } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import { getAdminDb } from "./client";
import type * as schema from "./schema";

export type UserTx = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Runs `fn` inside a transaction where PostgreSQL Row Level Security is
 * enforced for `userId`: the connection switches to the `authenticated` role
 * and exposes the user id through `request.jwt.claims`, exactly like
 * Supabase's PostgREST does. Any query touching another user's rows returns
 * nothing (select) or fails (insert/update/delete).
 */
export async function withUserDb<T>(userId: string, fn: (tx: UserTx) => Promise<T>): Promise<T> {
  if (!UUID_RE.test(userId)) throw new Error("Identifiant utilisateur invalide.");
  const db = getAdminDb();
  return db.transaction(async (tx) => {
    const claims = JSON.stringify({ sub: userId, role: "authenticated" });
    await tx.execute(sql`select set_config('request.jwt.claims', ${claims}, true)`);
    await tx.execute(sql`set local role authenticated`);
    return fn(tx);
  });
}
