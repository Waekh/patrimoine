/**
 * Accepted spellings for the Supabase credentials.
 *
 * This application never creates a Supabase client in the browser: the session
 * is handled by server actions and by `src/proxy.ts`. The `NEXT_PUBLIC_` prefix
 * is therefore not required, and the names without it are preferable on a host
 * that classifies variables, since nothing has to reach the browser.
 *
 * No `server-only` import here: `src/proxy.ts` reads these too.
 */
const URL_NAMES = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"] as const;

const KEY_NAMES = [
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
] as const;

/** Names the rest of the code normalises to. */
export const SUPABASE_URL_VARIABLE = URL_NAMES[0];
export const SUPABASE_KEY_VARIABLE = KEY_NAMES[0];

/** Names suggested to the operator when nothing is defined yet. */
export const RECOMMENDED_URL_VARIABLE = "SUPABASE_URL";
export const RECOMMENDED_KEY_VARIABLE = "SUPABASE_ANON_KEY";

function firstDefined(
  raw: Record<string, string | undefined>,
  names: readonly string[],
): { value: string; name: string } | undefined {
  for (const name of names) {
    const value = raw[name];
    if (value !== undefined && value !== "") return { value, name };
  }
  return undefined;
}

export interface SupabaseCredentials {
  url: string | undefined;
  /** The legacy `anon` key and the newer `sb_publishable_…` key go to the same place. */
  key: string | undefined;
  /** Spelling actually used, so a diagnostic names the variable the operator typed. */
  urlName: string;
  keyName: string;
}

export function resolveSupabaseCredentials(
  raw: Record<string, string | undefined>,
): SupabaseCredentials {
  const url = firstDefined(raw, URL_NAMES);
  const key = firstDefined(raw, KEY_NAMES);
  return {
    url: url?.value,
    key: key?.value,
    urlName: url?.name ?? RECOMMENDED_URL_VARIABLE,
    keyName: key?.name ?? RECOMMENDED_KEY_VARIABLE,
  };
}

/**
 * A malformed URL makes the Supabase client throw on construction. In the proxy,
 * which runs on every request, that would turn a typo into a site-wide outage.
 */
export function isUsableSupabaseUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}
