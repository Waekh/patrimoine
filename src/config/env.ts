import "server-only";
import { z } from "zod";

/**
 * Server-side environment. Parsed once, lazily, so that build steps that do
 * not need the database (e.g. static pages) never fail on a missing variable.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["development", "test", "preview", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL manquante"),
  AUTH_PROVIDER: z.enum(["local", "supabase"]).default("supabase"),
  LOCAL_AUTH_SECRET: z.string().min(16).optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  MARKET_DATA_PROVIDER: z.enum(["mock"]).default("mock"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  // Empty values in .env mean "not set".
  const raw = Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ""),
  );
  const parsed = serverEnvSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Configuration invalide (${fields}). Voir .env.example.`);
  }
  const env = parsed.data;
  if (env.AUTH_PROVIDER === "local" && env.NODE_ENV === "production" && env.APP_ENV !== "test") {
    throw new Error("AUTH_PROVIDER=local est interdit en production.");
  }
  if (env.AUTH_PROVIDER === "local" && !env.LOCAL_AUTH_SECRET) {
    throw new Error("LOCAL_AUTH_SECRET est requis avec AUTH_PROVIDER=local.");
  }
  if (
    env.AUTH_PROVIDER === "supabase" &&
    (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont requis.");
  }
  cached = env;
  return env;
}
