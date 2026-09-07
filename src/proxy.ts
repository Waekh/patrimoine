import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LOCAL_SESSION_COOKIE } from "@/lib/auth/local/session";

const PROTECTED_PREFIXES = [
  "/world",
  "/patrimoine",
  "/assets",
  "/liabilities",
  "/history",
  "/settings",
  "/onboarding",
];
const AUTH_PAGES = ["/login", "/register"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Optimistic route protection and Supabase session refresh. The real
 * authorization check happens server-side in `requireUser()`; this only
 * avoids rendering protected pages for obviously anonymous requests.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });
  let authenticated = false;

  if (process.env.AUTH_PROVIDER === "local") {
    authenticated = Boolean(request.cookies.get(LOCAL_SESSION_COOKIE)?.value);
  } else {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      const supabase = createServerClient(url, key, {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
            response = NextResponse.next({ request });
            for (const { name, value, options } of cookiesToSet)
              response.cookies.set(name, value, options);
          },
        },
      });
      const { data } = await supabase.auth.getUser();
      authenticated = Boolean(data.user);
    }
  }

  if (!authenticated && isProtected(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (authenticated && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/world", request.url));
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:png|svg|ico|webp|json)$).*)",
  ],
};
