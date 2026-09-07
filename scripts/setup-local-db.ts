import { readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { requireDatabaseUrl } from "./lib/db-url";
import { runMigrations } from "./migrate";

/**
 * Prepares a plain PostgreSQL database for local development:
 * 1. creates the Supabase-compatible roles and `auth` schema shim;
 * 2. applies the versioned migrations;
 * 3. re-grants table privileges to `authenticated` (RLS still applies).
 */
export async function setupLocalDatabase(url: string): Promise<void> {
  const shim = readFileSync(path.join(__dirname, "lib", "local-auth-schema.sql"), "utf8");
  const client = postgres(url, { max: 1 });
  try {
    await client.unsafe(shim);
  } finally {
    await client.end();
  }
  await runMigrations(url);
  const post = postgres(url, { max: 1 });
  try {
    await post.unsafe(
      "GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;",
    );
  } finally {
    await post.end();
  }
}

if (process.argv[1]?.endsWith("setup-local-db.ts")) {
  setupLocalDatabase(requireDatabaseUrl())
    .then(() => console.log("Base locale prête."))
    .catch((error: unknown) => {
      console.error("Échec du setup :", error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
