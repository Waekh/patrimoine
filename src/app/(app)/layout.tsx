import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";
import { isOnboardingCompleted } from "@/services/onboarding/onboarding-status";

// Every page below reads the session cookie: always rendered per request.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  if (!(await isOnboardingCompleted(user.id))) redirect("/onboarding");
  return <AppShell email={user.email}>{children}</AppShell>;
}
