import "server-only";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getServerEnv } from "@/config/env";
import { getAdminDb } from "@/db/client";
import { logger } from "@/lib/logger";
import { err, ok, type Result } from "@/lib/result";
import type { AuthError, AuthService, AuthUser, SignUpOutcome } from "../types";
import { hashPassword, verifyPassword } from "./password";
import {
  LOCAL_RESET_TTL_SECONDS,
  LOCAL_SESSION_COOKIE,
  LOCAL_SESSION_TTL_SECONDS,
  createLocalToken,
  verifyLocalToken,
} from "./session";

type LocalUserRow = {
  id: string;
  email: string;
  encrypted_password: string;
};

/**
 * Development/test adapter: credentials in the local `auth.users` shim,
 * session in a signed httpOnly cookie. Refused in production by `getServerEnv`.
 */
export class LocalAuthAdapter implements AuthService {
  readonly providerName = "local" as const;

  private secret(): string {
    return getServerEnv().LOCAL_AUTH_SECRET ?? "";
  }

  private async findByEmail(email: string): Promise<LocalUserRow | null> {
    const rows = await getAdminDb().execute<LocalUserRow>(
      sql`select id, email, encrypted_password from auth.users where email = ${email.toLowerCase()} limit 1`,
    );
    return rows[0] ?? null;
  }

  private async setSessionCookie(user: AuthUser): Promise<void> {
    const token = createLocalToken(
      {
        sub: user.id,
        email: user.email,
        purpose: "session",
        exp: Math.floor(Date.now() / 1000) + LOCAL_SESSION_TTL_SECONDS,
      },
      this.secret(),
    );
    const store = await cookies();
    store.set(LOCAL_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: LOCAL_SESSION_TTL_SECONDS,
    });
  }

  async signUp(email: string, password: string): Promise<Result<SignUpOutcome, AuthError>> {
    const existing = await this.findByEmail(email);
    if (existing) return err({ code: "EMAIL_TAKEN" });
    const id = randomUUID();
    await getAdminDb().execute(
      sql`insert into auth.users (id, email, encrypted_password, email_confirmed_at) values (${id}, ${email.toLowerCase()}, ${hashPassword(password)}, now())`,
    );
    const user = { id, email: email.toLowerCase() };
    await this.setSessionCookie(user);
    return ok({ user, requiresEmailConfirmation: false });
  }

  async signIn(email: string, password: string): Promise<Result<AuthUser, AuthError>> {
    const row = await this.findByEmail(email);
    if (!row || !verifyPassword(password, row.encrypted_password))
      return err({ code: "INVALID_CREDENTIALS" });
    const user = { id: row.id, email: row.email };
    await this.setSessionCookie(user);
    return ok(user);
  }

  async signOut(): Promise<void> {
    const store = await cookies();
    store.delete(LOCAL_SESSION_COOKIE);
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const store = await cookies();
    const payload = verifyLocalToken(
      store.get(LOCAL_SESSION_COOKIE)?.value,
      this.secret(),
      "session",
    );
    return payload ? { id: payload.sub, email: payload.email } : null;
  }

  async requestPasswordReset(email: string): Promise<Result<void, AuthError>> {
    const row = await this.findByEmail(email);
    if (row) {
      const token = createLocalToken(
        {
          sub: row.id,
          email: row.email,
          purpose: "reset",
          exp: Math.floor(Date.now() / 1000) + LOCAL_RESET_TTL_SECONDS,
        },
        this.secret(),
      );
      // No mail server in local mode: the link is printed for the developer.
      logger.info("auth.local.resetLink", {
        link: `${getServerEnv().NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`,
      });
    }
    return ok(undefined);
  }

  async updatePassword(newPassword: string, token?: string): Promise<Result<void, AuthError>> {
    let userId: string | null = null;
    if (token) {
      userId = verifyLocalToken(token, this.secret(), "reset")?.sub ?? null;
    } else {
      userId = (await this.getCurrentUser())?.id ?? null;
    }
    if (!userId) return err({ code: "INVALID_TOKEN" });
    await getAdminDb().execute(
      sql`update auth.users set encrypted_password = ${hashPassword(newPassword)}, updated_at = now() where id = ${userId}`,
    );
    return ok(undefined);
  }
}
