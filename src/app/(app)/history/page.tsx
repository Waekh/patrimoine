import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { LineChart } from "@/components/charts/line-chart";
import { withUserDb } from "@/db/user-db";
import { listSnapshots } from "@/db/queries/snapshots";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/formatting";
import { t } from "@/lib/i18n";
import { REFERENCE_CURRENCY } from "@/config/currencies";

export const metadata: Metadata = { title: `${t("history.title")} — ${t("app.name")}` };

export default async function HistoryPage() {
  const user = await requireUser();
  const snapshots = await withUserDb(user.id, (tx) => listSnapshots(tx, user.id, 365));
  const currency = snapshots[0]?.currency ?? REFERENCE_CURRENCY;
  return (
    <PageContainer>
      <PageHeader title={t("history.title")} />
      {snapshots.length === 0 ? (
        <EmptyState title={t("history.empty")} description={t("history.emptyHint")} />
      ) : (
        <div className="flex flex-col gap-4">
          <Card>
            <LineChart
              currency={currency}
              series={[
                {
                  id: "net",
                  label: t("history.netWorth"),
                  color: "#1f6f5b",
                  points: snapshots.map((s) => ({ date: s.date, valueCents: s.netWorthCents })),
                },
                {
                  id: "assets",
                  label: t("history.assets"),
                  color: "#4e93a8",
                  points: snapshots.map((s) => ({ date: s.date, valueCents: s.grossAssetsCents })),
                },
                {
                  id: "debts",
                  label: t("history.liabilities"),
                  color: "#b23a3a",
                  points: snapshots.map((s) => ({ date: s.date, valueCents: s.liabilitiesCents })),
                },
              ]}
            />
          </Card>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[520px] text-sm">
              <caption className="px-4 py-3 text-left text-sm font-semibold">
                {t("history.table")}
              </caption>
              <thead className="bg-surface-2 text-fg-muted text-left text-xs tracking-wide uppercase">
                <tr>
                  <th className="px-4 py-2 font-medium">{t("common.date")}</th>
                  <th className="px-4 py-2 text-right font-medium">{t("history.assets")}</th>
                  <th className="px-4 py-2 text-right font-medium">{t("history.liabilities")}</th>
                  <th className="px-4 py-2 text-right font-medium">{t("history.netWorth")}</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {snapshots.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2">{formatDate(s.date)}</td>
                    <td className="tabular px-4 py-2 text-right font-mono">
                      {formatCurrency({ amountCents: s.grossAssetsCents, currency: s.currency })}
                    </td>
                    <td className="tabular px-4 py-2 text-right font-mono">
                      {formatCurrency({ amountCents: s.liabilitiesCents, currency: s.currency })}
                    </td>
                    <td className="tabular px-4 py-2 text-right font-mono font-medium">
                      {formatCurrency({ amountCents: s.netWorthCents, currency: s.currency })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
