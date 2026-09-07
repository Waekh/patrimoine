import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServerEnv } from "@/config/env";

/**
 * Per-request Supabase client for Server Components, Server Actions and Route
 * Handlers. `setAll` silently fails inside Server Components (cookies are
 * read-only there); `src/proxy.ts` is responsible for refreshing sessions.
 */
export async function createSupabaseServerClient() {
  const env = getServerEnv();
  const cookieStore = await cookies();
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet)
              cookieStore.set(name, value, options);
          } catch {
            // Called from a Server Component: proxy.ts keeps the session fresh.
          }
        },
      },
    },
  );
}
