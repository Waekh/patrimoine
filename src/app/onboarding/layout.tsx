import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { LogoutButton } from "@/features/auth/logout-button";
import { requireProvisionedUser } from "@/services/auth/user-provisioning";
import { isOnboardingCompleted } from "@/services/onboarding/onboarding-status";

// Every page below reads the session cookie: always rendered per request.
export const dynamic = "force-dynamic";

export default async function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  // Provisioned, not merely authenticated: the questionnaire writes straight
  // away, and a session without its application row would fail on the foreign
  // key with nothing but a generic error to show for it.
  const user = await requireProvisionedUser();
  if (await isOnboardingCompleted(user.id)) redirect("/world");
  return (
    <div className="bg-bg flex min-h-screen flex-col">
      <header className="border-border bg-surface flex items-center justify-between border-b px-4 py-3 md:px-8">
        <Link href="/">
          <Logo />
        </Link>
        <div className="text-fg-muted flex items-center gap-3 text-xs">
          <span className="hidden sm:inline">{user.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 md:px-6 md:py-12">
        {children}
      </main>
    </div>
  );
}
