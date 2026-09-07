import { describe, expect, it } from "vitest";
import { evaluateConfiguration } from "./env";
import { isUsableSupabaseUrl } from "./supabase-credentials";

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
      expect(status.missing).toEqual(["DATABASE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY"]);
    }

    const withoutKeys = evaluateConfiguration({ DATABASE_URL: supabase.DATABASE_URL });
    expect(withoutKeys.ok).toBe(false);
    if (!withoutKeys.ok) {
      expect(withoutKeys.missing).toEqual(["SUPABASE_URL", "SUPABASE_ANON_KEY"]);
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

  it("accepts the Supabase publishable key under its own variable name", () => {
    const status = evaluateConfiguration({
      DATABASE_URL: supabase.DATABASE_URL,
      AUTH_PROVIDER: "supabase",
      NEXT_PUBLIC_SUPABASE_URL: supabase.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc123",
    });
    expect(status.ok).toBe(true);
    if (status.ok) expect(status.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("sb_publishable_abc123");
  });

  it("keeps an explicit anon key over the publishable alias", () => {
    const status = evaluateConfiguration({
      ...supabase,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc123",
    });
    expect(status.ok).toBe(true);
    if (status.ok) expect(status.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("anon-key");
  });

  it("accepts the Supabase credentials without the NEXT_PUBLIC_ prefix", () => {
    // This application never uses Supabase in the browser, so the prefix is optional.
    const status = evaluateConfiguration({
      DATABASE_URL: supabase.DATABASE_URL,
      AUTH_PROVIDER: "supabase",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc123",
    });
    expect(status.ok).toBe(true);
    if (status.ok) {
      expect(status.env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://project.supabase.co");
      expect(status.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("sb_publishable_abc123");
    }
  });

  it("gives the prefixed names precedence when both spellings are present", () => {
    const status = evaluateConfiguration({
      ...supabase,
      SUPABASE_URL: "https://other.supabase.co",
      SUPABASE_ANON_KEY: "other",
    });
    expect(status.ok).toBe(true);
    if (status.ok) {
      expect(status.env.NEXT_PUBLIC_SUPABASE_URL).toBe(supabase.NEXT_PUBLIC_SUPABASE_URL);
      expect(status.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("anon-key");
    }
  });

  it("names the variable the operator actually used when it is invalid", () => {
    const prefixed = evaluateConfiguration({
      ...supabase,
      NEXT_PUBLIC_SUPABASE_URL: "pas-une-url",
    });
    expect(prefixed.ok).toBe(false);
    if (!prefixed.ok) expect(prefixed.missing).toEqual(["NEXT_PUBLIC_SUPABASE_URL"]);

    const unprefixed = evaluateConfiguration({
      DATABASE_URL: supabase.DATABASE_URL,
      SUPABASE_URL: "pas-une-url",
      SUPABASE_ANON_KEY: "k",
    });
    expect(unprefixed.ok).toBe(false);
    if (!unprefixed.ok) expect(unprefixed.missing).toEqual(["SUPABASE_URL"]);
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

describe("isUsableSupabaseUrl", () => {
  it("accepts only URLs the Supabase client can be built with", () => {
    expect(isUsableSupabaseUrl("https://project.supabase.co")).toBe(true);
    expect(isUsableSupabaseUrl("http://localhost:54321")).toBe(true);
    // A typo here used to make every route fail, including the static pages.
    expect(isUsableSupabaseUrl("pas-une-url")).toBe(false);
    expect(isUsableSupabaseUrl("project.supabase.co")).toBe(false);
    expect(isUsableSupabaseUrl("")).toBe(false);
    expect(isUsableSupabaseUrl(undefined)).toBe(false);
  });
});
