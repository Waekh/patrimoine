import Link from "next/link";
import { t } from "@/lib/i18n";
import { Logo } from "@/components/layout/logo";

// Every page below reads the session cookie: always rendered per request.
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="bg-bg flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>
      <main className="border-border bg-surface w-full max-w-sm rounded-lg border p-6">
        {children}
      </main>
      <p className="text-fg-muted mt-8 max-w-sm text-center text-xs">{t("app.disclaimer")}</p>
    </div>
  );
}
