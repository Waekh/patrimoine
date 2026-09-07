import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { t } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";

// Reads the session cookie to adapt the header.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <Link href="/world" className="font-medium underline-offset-2 hover:underline">
              {t("nav.world")}
            </Link>
          ) : (
            <>
              <Link href="/login" className="underline-offset-2 hover:underline">
                {t("nav.login")}
              </Link>
              <Link
                href="/register"
                className="bg-accent text-accent-fg hover:bg-accent-hover rounded-md px-3 py-1.5 font-medium"
              >
                {t("nav.register")}
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-16">
        <section className="flex flex-col gap-6">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
            {t("home.title")}
          </h1>
          <p className="text-fg-muted max-w-xl text-lg">{t("home.subtitle")}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/register"
              className="bg-accent text-accent-fg hover:bg-accent-hover inline-flex h-11 items-center rounded-md px-5 text-sm font-medium"
            >
              {t("home.cta")}
            </Link>
            <Link
              href="/demo"
              className="border-border bg-surface hover:bg-surface-2 inline-flex h-11 items-center rounded-md border px-5 text-sm font-medium"
            >
              {t("home.demo")}
            </Link>
          </div>
        </section>
        <section className="grid gap-6 md:grid-cols-3">
          {[
            [t("home.how1Title"), t("home.how1Text")],
            [t("home.how2Title"), t("home.how2Text")],
            [t("home.how3Title"), t("home.how3Text")],
          ].map(([title, text], i) => (
            <div
              key={title}
              className="border-border bg-surface flex flex-col gap-2 rounded-lg border p-5"
            >
              <span className="tabular text-fg-muted font-mono text-xs">0{i + 1}</span>
              <h2 className="font-semibold">{title}</h2>
              <p className="text-fg-muted text-sm">{text}</p>
            </div>
          ))}
        </section>
      </main>
      <footer className="text-fg-muted mx-auto w-full max-w-5xl px-6 py-8 text-xs">
        {t("app.disclaimer")}
      </footer>
    </div>
  );
}
