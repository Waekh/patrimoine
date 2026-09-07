import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Minimal signed token (HMAC-SHA256) for the local adapter's session cookie
 * and password-reset links. Payload: base64url(JSON).signature.
 */
export interface LocalTokenPayload {
  sub: string;
  email: string;
  purpose: "session" | "reset";
  exp: number;
}

export const LOCAL_SESSION_COOKIE = "patrimoine_local_session";
export const LOCAL_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const LOCAL_RESET_TTL_SECONDS = 60 * 60;

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function createLocalToken(payload: LocalTokenPayload, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data, secret)}`;
}

export function verifyLocalToken(
  token: string | undefined,
  secret: string,
  purpose: LocalTokenPayload["purpose"],
): LocalTokenPayload | null {
  if (!token) return null;
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;
  const expected = sign(data, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    const p = parsed as Partial<LocalTokenPayload>;
    if (typeof p.sub !== "string" || typeof p.email !== "string" || typeof p.exp !== "number")
      return null;
    if (p.purpose !== purpose) return null;
    if (p.exp * 1000 < Date.now()) return null;
    return { sub: p.sub, email: p.email, purpose: p.purpose, exp: p.exp };
  } catch {
    return null;
  }
}
