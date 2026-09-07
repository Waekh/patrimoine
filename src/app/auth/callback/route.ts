import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/auth/supabase/server";
import { getServerEnv } from "@/config/env";

/** Exchanges a Supabase auth code (e-mail confirmation, password recovery) for a session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/world";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/world";

  if (code && getServerEnv().AUTH_PROVIDER === "supabase") {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=callback`);
}
