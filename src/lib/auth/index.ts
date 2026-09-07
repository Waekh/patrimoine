import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getServerEnv } from "@/config/env";
import { LocalAuthAdapter } from "./local/adapter";
import { SupabaseAuthAdapter } from "./supabase/adapter";
import type { AuthService, AuthUser } from "./types";

export type { AuthService, AuthUser } from "./types";

let instance: AuthService | null = null;

export function getAuthService(): AuthService {
  if (instance) return instance;
  const env = getServerEnv();
  instance = env.AUTH_PROVIDER === "local" ? new LocalAuthAdapter() : new SupabaseAuthAdapter();
  return instance;
}

/** Request-scoped, deduplicated current user lookup. */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  return getAuthService().getCurrentUser();
});

/** For protected layouts and actions: redirects to /login when anonymous. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
