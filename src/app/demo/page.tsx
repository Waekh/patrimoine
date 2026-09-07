import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { getClientManifest } from "@/features/world/client-manifest";
import { WorldView } from "@/features/world/world-view";
import { t } from "@/lib/i18n";
import { DEMO_ASSETS, DEMO_LIABILITIES } from "@/services/demo/demo-dataset";
import { buildWorld, computeSummary } from "@/services/finance/wealth-overview";

export const metadata: Metadata = { title: `${t("demo.title")} — ${t("app.name")}` };

/** Public demo world built from the fictional dataset; nothing is read from the database. */
export default async function DemoPage() {
  const summary = await computeSummary(DEMO_ASSETS, DEMO_LIABILITIES);
  const world = buildWorld("demo", DEMO_ASSETS, DEMO_LIABILITIES, summary);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border bg-surface flex h-12 items-center justify-between border-b px-4">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/login" className="underline-offset-2 hover:underline">
            {t("nav.login")}
          </Link>
          <Link
            href="/register"
            className="bg-accent text-accent-fg hover:bg-accent-hover rounded-md px-3 py-1.5 font-medium"
          >
            {t("home.cta")}
          </Link>
        </nav>
      </header>
      <div className="flex-1 pb-[3.5rem] md:pb-0">
        <WorldView
          world={world}
          manifest={getClientManifest()}
          assets={DEMO_ASSETS}
          liabilities={DEMO_LIABILITIES}
          deltaBps={null}
          animateOnMount
          readOnly
          banner={t("world.demoBanner")}
        />
      </div>
    </div>
  );
}
