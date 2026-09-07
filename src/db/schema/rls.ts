import { sql } from "drizzle-orm";
import { pgPolicy } from "drizzle-orm/pg-core";
import { authenticatedRole, authUid } from "drizzle-orm/supabase";
import type { PgColumn } from "drizzle-orm/pg-core";

/**
 * Standard owner-only policies. Every user-scoped table gets exactly these four
 * policies so that `auth.uid() = user_id` is enforced on all verbs.
 */
export function ownerPolicies(tableName: string, userIdColumn: PgColumn) {
  const owns = sql`${authUid} = ${userIdColumn}`;
  return [
    pgPolicy(`${tableName}_select_own`, { for: "select", to: authenticatedRole, using: owns }),
    pgPolicy(`${tableName}_insert_own`, { for: "insert", to: authenticatedRole, withCheck: owns }),
    pgPolicy(`${tableName}_update_own`, {
      for: "update",
      to: authenticatedRole,
      using: owns,
      withCheck: owns,
    }),
    pgPolicy(`${tableName}_delete_own`, { for: "delete", to: authenticatedRole, using: owns }),
  ];
}
