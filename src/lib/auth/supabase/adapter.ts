import "server-only";
import { getServerEnv } from "@/config/env";
import { logger } from "@/lib/logger";
import { err, ok, type Result } from "@/lib/result";
import type { AuthError, AuthService, AuthUser, SignUpOutcome } from "../types";
import { createSupabaseServerClient } from "./server";

function mapAuthError(message: string, status?: number): AuthError {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists"))
    return { code: "EMAIL_TAKEN" };
  if (m.includes("password") && (m.includes("weak") || m.includes("at least")))
    return { code: "WEAK_PASSWORD" };
  if (status === 400 || m.includes("invalid login") || m.includes("invalid credentials")) {
    return { code: "INVALID_CREDENTIALS" };
  }
  return { code: "UNAVAILABLE" };
}

export class SupabaseAuthAdapter implements AuthService {
  readonly providerName = "supabase" as const;

  async signUp(email: string, password: string): Promise<Result<SignUpOutcome, AuthError>> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${getServerEnv().NEXT_PUBLIC_APP_URL}/auth/callback` },
    });
    if (error) {
      logger.warn("auth.signUp.failed", { status: error.status });
      return err(mapAuthError(error.message, error.status));
    }
    const user = data.user?.email ? { id: data.user.id, email: data.user.email } : null;
    return ok({ user, requiresEmailConfirmation: data.session === null });
  }

  async signIn(email: string, password: string): Promise<Result<AuthUser, AuthError>> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user?.email) {
      return err(
        error ? mapAuthError(error.message, error.status) : { code: "INVALID_CREDENTIALS" },
      );
    }
    return ok({ id: data.user.id, email: data.user.email });
  }

  async signOut(): Promise<void> {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const supabase = await createSupabaseServerClient();
    // getUser() validates the token against Supabase Auth; never trust getSession() alone.
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.email) return null;
    return { id: data.user.id, email: data.user.email };
  }

  async requestPasswordReset(email: string): Promise<Result<void, AuthError>> {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getServerEnv().NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
    });
    if (error) {
      logger.warn("auth.reset.failed", { status: error.status });
      // Do not reveal whether the address exists.
      return error.status && error.status >= 500 ? err({ code: "UNAVAILABLE" }) : ok(undefined);
    }
    return ok(undefined);
  }

  async updatePassword(newPassword: string): Promise<Result<void, AuthError>> {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return err(mapAuthError(error.message, error.status));
    return ok(undefined);
  }
}
