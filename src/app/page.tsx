import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { getClientManifest } from "@/features/world/client-manifest";
import { WorldShowcase } from "@/features/world/world-showcase";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/formatting";
import { messages, t } from "@/lib/i18n";
import { getShowcaseWorld } from "@/services/demo/showcase-world";

/**
 * The header shows a link that depends on the visitor's session, so the page is
 * rendered per request. The landscape itself is computed once per instance.
 */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [user, showcase] = await Promise.all([getCurrentUser(), getShowcaseWorld()]);
  const { summary, world } = showcase;

  return (
    <div className="flex min-h-screen flex-col">
      <section className="bg-world-bg relative isolate flex min-h-[560px] flex-col overflow-hidden text-white md:min-h-[720px]">
        <div className="absolute inset-0" aria-hidden="true">
          <WorldShowcase world={world} manifest={getClientManifest()} />
        </div>
        {/* Scrim: vertical on mobile where the text sits above the scene, horizontal on wide screens. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,32,0.95)_0%,rgba(15,23,32,0.9)_55%,rgba(15,23,32,0.5)_82%,rgba(15,23,32,0.9)_100%)] md:bg-[linear-gradient(90deg,rgba(15,23,32,0.96)_0%,rgba(15,23,32,0.86)_38%,rgba(15,23,32,0.35)_72%,rgba(15,23,32,0.15)_100%)]"
        />

        <header className="relative mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
          <span className="text-white">
            <span className="sm:hidden">
              <Logo compact />
            </span>
            <span className="hidden sm:inline-flex">
              <Logo />
            </span>
          </span>
          <nav className="flex items-center gap-3 text-sm sm:gap-4">
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

        <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-6 px-6 py-16">
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight md:text-5xl">
            {t("home.title")}
          </h1>
          <p className="max-w-md text-lg text-white/75">{t("home.subtitle")}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/register"
              className="bg-accent text-accent-fg hover:bg-accent-hover inline-flex h-11 items-center rounded-md px-5 text-sm font-medium"
            >
              {t("home.cta")}
            </Link>
            <Link
              href="/demo"
              className="inline-flex h-11 items-center rounded-md border border-white/25 px-5 text-sm font-medium text-white hover:bg-white/10"
            >
              {t("home.demo")}
            </Link>
          </div>

          {/* Reads the same figures as the scene: the number and the world tell one story. */}
          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-4">
            {[
              [t("wealth.netWorth"), formatCurrency(summary.netWorth)],
              [t("world.level"), messages.world.levels[world.resources.worldLevel]],
              [t("world.buildingsList"), String(world.buildings.length)],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1">
                <dt className="text-xs tracking-wide text-white/55 uppercase">{label}</dt>
                <dd className="tabular font-mono text-lg font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-white/50">{t("world.demoBanner")}</p>
        </div>
      </section>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
        <h2 className="text-fg-muted mb-6 text-sm font-semibold tracking-wide uppercase">
          {t("home.howTitle")}
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            [t("home.how1Title"), t("home.how1Text")],
            [t("home.how2Title"), t("home.how2Text")],
            [t("home.how3Title"), t("home.how3Text")],
          ].map(([title, text], index) => (
            <div
              key={title}
              className="border-border bg-surface flex flex-col gap-2 rounded-lg border p-5"
            >
              <span className="tabular text-fg-muted font-mono text-xs">0{index + 1}</span>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-fg-muted text-sm">{text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-fg-muted mx-auto w-full max-w-5xl px-6 py-8 text-xs">
        {t("app.disclaimer")}
      </footer>
    </div>
  );
}
