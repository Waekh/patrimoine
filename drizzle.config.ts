import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  // Supabase manages its own roles (anon, authenticated, service_role); drizzle-kit must not touch them.
  entities: { roles: { provider: "supabase" } },
  strict: true,
  verbose: true,
});
