import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState, Notice } from "@/components/ui/states";
import { AllocationChart } from "@/features/wealth/allocation-chart";
import { WealthSummaryCards } from "@/features/wealth/wealth-summary-cards";
import { withUserDb } from "@/db/user-db";
import { listSnapshots } from "@/db/queries/snapshots";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/formatting";
import { messages, t } from "@/lib/i18n";
import { getWealthOverview } from "@/services/finance/wealth-overview";
import { netWorthDeltaBps } from "@/services/finance/snapshot-delta";

export const metadata: Metadata = { title: `${t("nav.wealth")} — ${t("app.name")}` };

export default async function WealthPage() {
  const user = await requireUser();
  const [overview, snapshots] = await Promise.all([
    getWealthOverview(user.id),
    withUserDb(user.id, (tx) => listSnapshots(tx, user.id, 2)),
  ]);
  const { summary, assets, liabilities, world } = overview;
  const unconvertible =
    summary.unconvertibleAssetIds.length + summary.unconvertibleLiabilityIds.length;

  return (
    <PageContainer>
      <PageHeader title={t("nav.wealth")} />
      {unconvertible > 0 ? (
        <Notice tone="warning" className="mb-4">
          {t("wealth.unconvertible", { count: unconvertible })}
        </Notice>
      ) : null}
      <WealthSummaryCards
        summary={summary}
        resources={world.resources}
        deltaBps={netWorthDeltaBps(snapshots)}
      />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">{t("wealth.allocation")}</h2>
          <AllocationChart byFamily={summary.byFamily} total={summary.grossAssets} />
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t("nav.assets")}</h2>
            <Link
              href="/assets"
              className="text-fg-muted text-xs underline-offset-2 hover:underline"
            >
              {t("common.seeAll")}
            </Link>
          </div>
          {assets.length === 0 ? (
            <EmptyState title={t("assets.empty")} description={t("assets.emptyHint")} />
          ) : (
            <ul className="divide-border divide-y">
              {assets.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{a.name}</span>
                    <span className="text-fg-muted text-xs">
                      {messages.assets.categories[a.category]}
                    </span>
                  </span>
                  <span className="tabular font-mono">
                    {summary.assetValues[a.id]
                      ? formatCurrency(summary.assetValues[a.id]!)
                      : t("common.unavailable")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="md:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t("nav.liabilities")}</h2>
            <Link
              href="/liabilities"
              className="text-fg-muted text-xs underline-offset-2 hover:underline"
            >
              {t("common.seeAll")}
            </Link>
          </div>
          {liabilities.length === 0 ? (
            <p className="text-fg-muted text-sm">{t("liabilities.empty")}</p>
          ) : (
            <ul className="divide-border divide-y">
              {liabilities.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{l.name}</span>
                    <span className="text-fg-muted text-xs">
                      {messages.liabilities.types[l.type]}
                    </span>
                  </span>
                  <span className="tabular font-mono">
                    {summary.liabilityValues[l.id]
                      ? formatCurrency(summary.liabilityValues[l.id]!)
                      : t("common.unavailable")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
