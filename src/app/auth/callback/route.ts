import { NextResponse, type NextRequest } from "next/server";
import { getConfigurationStatus } from "@/config/env";
import { createSupabaseServerClient } from "@/lib/auth/supabase/server";
import { logger } from "@/lib/logger";
import { provisionUser } from "@/services/auth/user-provisioning";

/** Exchanges a Supabase auth code (e-mail confirmation, password recovery) for a session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/world";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/world";
  const status = getConfigurationStatus();

  if (code && status.ok && status.env.AUTH_PROVIDER === "supabase") {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Confirming by e-mail is a way into the application that never goes
      // through the sign-in action, so the application row is created here too.
      // A failure must not strand the visitor on an error page: the
      // authenticated layouts provision again on the way in.
      const user = data.user;
      if (user?.email) {
        try {
          await provisionUser({ id: user.id, email: user.email });
        } catch (provisionError) {
          logger.error("auth.callback.provision.failed", provisionError, { userId: user.id });
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=callback`);
}
