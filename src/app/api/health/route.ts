import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getConfigurationStatus } from "@/config/env";
import { getAdminDb } from "@/db/client";
import { assets } from "@/db/schema";
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
  // Reads a real table under the `authenticated` role: this covers the role switch
  // *and* the table privileges that role needs. RLS returns no row for the probe
  // user, so nothing is disclosed. Runs only when the connection works, otherwise
  // it would report the same failure twice.
  const rls = database.ok
    ? await check("rls", () =>
        withUserDb(PROBE_USER_ID, (tx) => tx.execute(sql`select count(*) from ${assets}`)),
      )
    : { ok: false };
  const healthy = database.ok && rls.ok;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      configuration: {
        ok: true,
        authProvider: status.env.AUTH_PROVIDER,
        appEnv: status.env.APP_ENV,
        // Base of the confirmation and password-reset links sent by e-mail:
        // if it shows localhost in production, define APP_URL.
        appUrl: status.env.NEXT_PUBLIC_APP_URL,
      },
      database,
      rls,
    },
    { status: healthy ? 200 : 503 },
  );
}
