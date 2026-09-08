import "server-only";
import { cache } from "react";
import { ensureUserRecord } from "@/db/queries/users";
import { withUserDb } from "@/db/user-db";
import { requireUser } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth/types";

/**
 * Creates the application row backing an authenticated session.
 *
 * The identity provider and the application database are two separate stores:
 * Supabase creates the account in `auth.users`, while every application table
 * has a foreign key to `public.users`. A session whose application row is
 * missing authenticates fine and then fails on the first write, which surfaces
 * as a generic error in the questionnaire rather than anything diagnosable.
 *
 * Provisioning therefore happens on the way into any authenticated layout, not
 * only on sign-in: a visitor who confirms their address by e-mail lands in the
 * app straight from the callback, and an account created before this rule
 * existed heals on its next visit. `cache` keeps it to one statement per
 * request even when a layout and its page both ask.
 */
export const provisionUser = cache(async (user: AuthUser): Promise<AuthUser> => {
  await withUserDb(user.id, (tx) => ensureUserRecord(tx, user));
  return user;
});

/** `requireUser`, with the guarantee that the application row exists. */
export async function requireProvisionedUser(user?: AuthUser): Promise<AuthUser> {
  return provisionUser(user ?? (await requireUser()));
}
