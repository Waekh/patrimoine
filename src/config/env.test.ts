import { describe, expect, it } from "vitest";
import { evaluateConfiguration } from "./env";

const supabase = {
  DATABASE_URL: "postgres://u:p@host:6543/db",
  AUTH_PROVIDER: "supabase",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
};

describe("evaluateConfiguration", () => {
  it("accepts a complete Supabase configuration", () => {
    const status = evaluateConfiguration(supabase);
    expect(status.ok).toBe(true);
    if (status.ok) expect(status.env.AUTH_PROVIDER).toBe("supabase");
  });

  it("reports missing variables by name instead of throwing", () => {
    const status = evaluateConfiguration({});
    expect(status.ok).toBe(false);
    // The whole list at once, so the operator configures the deployment in one pass.
    if (!status.ok) {
      expect(status.missing).toEqual([
        "DATABASE_URL",
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ]);
    }

    const withoutKeys = evaluateConfiguration({ DATABASE_URL: supabase.DATABASE_URL });
    expect(withoutKeys.ok).toBe(false);
    if (!withoutKeys.ok) {
      expect(withoutKeys.missing).toEqual([
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ]);
    }
  });

  it("treats empty strings as unset", () => {
    const status = evaluateConfiguration({ ...supabase, DATABASE_URL: "" });
    expect(status.ok).toBe(false);
    if (!status.ok) expect(status.missing).toContain("DATABASE_URL");
  });

  it("refuses the local auth adapter in production and requires its secret", () => {
    const production = evaluateConfiguration({
      DATABASE_URL: supabase.DATABASE_URL,
      AUTH_PROVIDER: "local",
      NODE_ENV: "production",
    });
    expect(production.ok).toBe(false);
    if (!production.ok) expect(production.reason).toMatch(/interdit en production/);

    const noSecret = evaluateConfiguration({
      DATABASE_URL: supabase.DATABASE_URL,
      AUTH_PROVIDER: "local",
    });
    expect(noSecret.ok).toBe(false);
    if (!noSecret.ok) expect(noSecret.missing).toEqual(["LOCAL_AUTH_SECRET"]);

    const valid = evaluateConfiguration({
      DATABASE_URL: supabase.DATABASE_URL,
      AUTH_PROVIDER: "local",
      LOCAL_AUTH_SECRET: "a-secret-long-enough",
    });
    expect(valid.ok).toBe(true);
  });

  it("derives the public URL from the Vercel deployment host", () => {
    const status = evaluateConfiguration({
      ...supabase,
      VERCEL_PROJECT_PRODUCTION_URL: "patrimoinenet.vercel.app",
    });
    expect(status.ok).toBe(true);
    if (status.ok) expect(status.env.NEXT_PUBLIC_APP_URL).toBe("https://patrimoinenet.vercel.app");
  });

  it("keeps an explicit public URL over the inferred one", () => {
    const status = evaluateConfiguration({
      ...supabase,
      NEXT_PUBLIC_APP_URL: "https://patrimoine.example",
      VERCEL_URL: "preview.vercel.app",
    });
    expect(status.ok).toBe(true);
    if (status.ok) expect(status.env.NEXT_PUBLIC_APP_URL).toBe("https://patrimoine.example");
  });
});
