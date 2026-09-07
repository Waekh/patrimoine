import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDatabase>;

function createDatabase(url: string) {
  const client = postgres(url, {
    // Required by Supabase's transaction pooler (PgBouncer): no prepared statements.
    prepare: false,
    // Serverless runtimes start many short-lived instances: keep each pool small
    // and let idle connections go so the database is not saturated.
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idle_timeout: 20,
    connect_timeout: 15,
  });
  return drizzle(client, { schema, casing: "snake_case" });
}

declare global {
  var __patrimoineDb: Database | undefined;
}

/**
 * Privileged connection (bypasses RLS on Supabase's `postgres` role). Only for
 * migrations, seeding, the local auth adapter and `withUserDb`, which
 * immediately downgrades to the `authenticated` role inside a transaction.
 */
let instance: Database | null = null;

export function getAdminDb(): Database {
  // One pool per process (globalThis also survives HMR reloads in development).
  if (instance) return instance;
  if (globalThis.__patrimoineDb) {
    instance = globalThis.__patrimoineDb;
    return instance;
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquante. Voir .env.example.");
  instance = createDatabase(url);
  globalThis.__patrimoineDb = instance;
  return instance;
}
