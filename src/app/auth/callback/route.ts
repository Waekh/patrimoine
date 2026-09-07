import { NextResponse, type NextRequest } from "next/server";
import { getConfigurationStatus } from "@/config/env";
import { createSupabaseServerClient } from "@/lib/auth/supabase/server";

/** Exchanges a Supabase auth code (e-mail confirmation, password recovery) for a session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/world";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/world";
  const status = getConfigurationStatus();

  if (code && status.ok && status.env.AUTH_PROVIDER === "supabase") {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=callback`);
}
