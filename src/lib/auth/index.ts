import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getConfigurationStatus, getServerEnv } from "@/config/env";
import { logger } from "@/lib/logger";
import { LocalAuthAdapter } from "./local/adapter";
import { SupabaseAuthAdapter } from "./supabase/adapter";
import type { AuthService, AuthUser } from "./types";

export type { AuthService, AuthUser } from "./types";

let instance: AuthService | null = null;
let configurationWarned = false;

/** Throws a ConfigurationError when the deployment is not configured. */
export function getAuthService(): AuthService {
  if (instance) return instance;
  const env = getServerEnv();
  instance = env.AUTH_PROVIDER === "local" ? new LocalAuthAdapter() : new SupabaseAuthAdapter();
  return instance;
}

function getAuthServiceOrNull(): AuthService | null {
  const status = getConfigurationStatus();
  if (!status.ok) {
    if (!configurationWarned) {
      configurationWarned = true;
      logger.warn("config.incomplete", {
        missing: status.missing.join(","),
        reason: status.reason,
      });
    }
    return null;
  }
  return getAuthService();
}

/**
 * Request-scoped current user. Never throws: a missing configuration or a
 * provider outage makes the visitor anonymous (least privilege) so that public
 * pages keep rendering and protected pages redirect to /login.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const service = getAuthServiceOrNull();
  if (!service) return null;
  try {
    return await service.getCurrentUser();
  } catch (error) {
    logger.error("auth.currentUser.failed", error);
    return null;
  }
});

/** For protected layouts and actions: redirects to /login when anonymous. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
