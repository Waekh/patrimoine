import type { Result } from "@/lib/result";

export interface AuthUser {
  id: string;
  email: string;
}

export type AuthErrorCode =
  "INVALID_CREDENTIALS" | "EMAIL_TAKEN" | "WEAK_PASSWORD" | "INVALID_TOKEN" | "UNAVAILABLE";

export interface AuthError {
  code: AuthErrorCode;
}

export interface SignUpOutcome {
  user: AuthUser | null;
  /** True when the provider requires an e-mail confirmation before login. */
  requiresEmailConfirmation: boolean;
}

/**
 * The only authentication boundary of the application. Implemented by
 * `SupabaseAuthAdapter` (production) and `LocalAuthAdapter` (development).
 */
export interface AuthService {
  readonly providerName: "supabase" | "local";
  signUp(email: string, password: string): Promise<Result<SignUpOutcome, AuthError>>;
  signIn(email: string, password: string): Promise<Result<AuthUser, AuthError>>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<AuthUser | null>;
  requestPasswordReset(email: string): Promise<Result<void, AuthError>>;
  /** `token` is the recovery code (local) or ignored (Supabase, session-based). */
  updatePassword(newPassword: string, token?: string): Promise<Result<void, AuthError>>;
}
