import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { requireDatabaseUrl } from "./lib/db-url";

export async function runMigrations(url: string): Promise<void> {
  const client = postgres(url, { max: 1, prepare: false });
  try {
    await migrate(drizzle(client), { migrationsFolder: "./src/db/migrations" });
  } finally {
    await client.end();
  }
}

if (process.argv[1]?.endsWith("migrate.ts")) {
  runMigrations(requireDatabaseUrl())
    .then(() => console.log("Migrations appliquées."))
    .catch((error: unknown) => {
      console.error("Échec des migrations :", error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
