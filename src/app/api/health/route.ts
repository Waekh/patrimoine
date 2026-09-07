import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getConfigurationStatus } from "@/config/env";
import { getAdminDb } from "@/db/client";
import { withUserDb } from "@/db/user-db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** Probe user: a syntactically valid identifier that owns no row. */
const PROBE_USER_ID = "00000000-0000-4000-8000-000000000000";

interface Check {
  ok: boolean;
  /** Correlates with the server logs; never carries the error message itself. */
  reference?: string;
}

async function check(name: string, run: () => Promise<unknown>): Promise<Check> {
  try {
    await run();
    return { ok: true };
  } catch (error) {
    return { ok: false, reference: logger.error(`health.${name}.failed`, error) };
  }
}

/**
 * Deployment diagnostics. Reports the environment variables still to define
 * (names only, never values), whether the database answers, and whether the
 * `authenticated` role switch that enforces RLS works on this database.
 */
export async function GET() {
  const status = getConfigurationStatus();
  if (!status.ok) {
    return NextResponse.json(
      {
        status: "unconfigured",
        configuration: { ok: false, missing: status.missing, reason: status.reason },
      },
      { status: 503 },
    );
  }

  const database = await check("database", () => getAdminDb().execute(sql`select 1`));
  // Runs only when the connection works, otherwise it would report the same failure twice.
  const rls = database.ok
    ? await check("rls", () => withUserDb(PROBE_USER_ID, (tx) => tx.execute(sql`select 1`)))
    : { ok: false };
  const healthy = database.ok && rls.ok;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      configuration: {
        ok: true,
        authProvider: status.env.AUTH_PROVIDER,
        appEnv: status.env.APP_ENV,
      },
      database,
      rls,
    },
    { status: healthy ? 200 : 503 },
  );
}
