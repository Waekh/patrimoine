import "server-only";
import { z } from "zod";

/**
 * Server-side environment. Read lazily so that pages which need no
 * configuration (home, /demo, error pages) still render on a deployment where
 * the environment variables have not been set yet.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["development", "test", "preview", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  AUTH_PROVIDER: z.enum(["local", "supabase"]).default("supabase"),
  LOCAL_AUTH_SECRET: z.string().min(16).optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  MARKET_DATA_PROVIDER: z.enum(["mock"]).default("mock"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export interface ConfigurationProblem {
  /** Names of the variables to define. Names only, never values. */
  missing: string[];
  /** Operator-facing explanation (server logs, /api/health). Never shown to end users. */
  reason: string;
}

export type ConfigurationStatus =
  { ok: true; env: ServerEnv } | ({ ok: false } & ConfigurationProblem);

/** Raised when a code path that genuinely needs configuration runs without it. */
export class ConfigurationError extends Error {
  constructor(readonly problem: ConfigurationProblem) {
    super(`Configuration incomplète : ${problem.reason}`);
    this.name = "ConfigurationError";
  }
}

/**
 * Vercel exposes the deployment host but no protocol. Deriving the public URL
 * keeps confirmation and password-reset links correct without extra setup.
 */
function inferAppUrl(raw: Record<string, string | undefined>): string | undefined {
  if (raw.NEXT_PUBLIC_APP_URL) return raw.NEXT_PUBLIC_APP_URL;
  const host = raw.VERCEL_PROJECT_PRODUCTION_URL ?? raw.VERCEL_URL;
  return host ? `https://${host}` : undefined;
}

/** Pure evaluation of a raw environment. Exported for tests. */
export function evaluateConfiguration(
  raw: Record<string, string | undefined>,
): ConfigurationStatus {
  // An empty string in a .env file or a Vercel variable means "not set".
  const defined: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value !== undefined && value !== "") defined[key] = value;
  }
  const appUrl = inferAppUrl(defined);
  if (appUrl) defined.NEXT_PUBLIC_APP_URL = appUrl;
  // Supabase now issues a "publishable" key and its own snippets name it
  // NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. It is passed exactly where the legacy
  // anon key was, so accept either name.
  if (!defined.NEXT_PUBLIC_SUPABASE_ANON_KEY && defined.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    defined.NEXT_PUBLIC_SUPABASE_ANON_KEY = defined.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  }

  // Checked first: a policy violation that adding more variables cannot fix.
  const provider = defined.AUTH_PROVIDER ?? "supabase";
  if (provider === "local" && defined.NODE_ENV === "production" && defined.APP_ENV !== "test") {
    return {
      ok: false,
      missing: ["AUTH_PROVIDER"],
      reason: "AUTH_PROVIDER=local est interdit en production",
    };
  }

  const parsed = serverEnvSchema.safeParse(defined);
  const missing = new Set<string>(
    parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.map(String).join(".")),
  );

  // Provider requirements are evaluated even when the base parse failed, so the
  // operator gets the complete list in one pass instead of one variable at a time.
  if (provider === "supabase") {
    if (!defined.NEXT_PUBLIC_SUPABASE_URL) missing.add("NEXT_PUBLIC_SUPABASE_URL");
    if (!defined.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.add("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  } else if (provider === "local" && !defined.LOCAL_AUTH_SECRET) {
    missing.add("LOCAL_AUTH_SECRET");
  }

  if (missing.size > 0) {
    const names = [...missing];
    return {
      ok: false,
      missing: names,
      reason: `variables absentes ou invalides : ${names.join(", ")}`,
    };
  }
  // Unreachable once `missing` is empty: every parse issue carries a path that
  // was collected above. Kept so TypeScript can narrow `parsed`.
  if (!parsed.success) return { ok: false, missing: [], reason: "configuration invalide" };

  return { ok: true, env: parsed.data };
}

let cached: ConfigurationStatus | null = null;

/** Never throws: use it to decide what a page can render. */
export function getConfigurationStatus(): ConfigurationStatus {
  cached ??= evaluateConfiguration(process.env);
  return cached;
}

export function isAppConfigured(): boolean {
  return getConfigurationStatus().ok;
}

/** Throws a ConfigurationError for code paths that cannot work without configuration. */
export function getServerEnv(): ServerEnv {
  const status = getConfigurationStatus();
  if (!status.ok) throw new ConfigurationError(status);
  return status.env;
}
