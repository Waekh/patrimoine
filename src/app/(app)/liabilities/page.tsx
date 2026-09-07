import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState, Notice } from "@/components/ui/states";
import { DeleteLiabilityButton } from "@/features/liabilities/delete-liability-button";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatPercentage } from "@/lib/formatting";
import { messages, t } from "@/lib/i18n";
import { getWealthOverview } from "@/services/finance/wealth-overview";

export const metadata: Metadata = { title: `${t("liabilities.title")} — ${t("app.name")}` };

export default async function LiabilitiesPage({ searchParams }: PageProps<"/liabilities">) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const { liabilities, assets, summary } = await getWealthOverview(user.id);
  const assetNames = new Map(assets.map((a) => [a.id, a.name]));
  const notice = params.created
    ? t("liabilities.created")
    : params.updated
      ? t("liabilities.updated")
      : params.deleted
        ? t("liabilities.deleted")
        : null;
  return (
    <PageContainer>
      <PageHeader
        title={t("liabilities.title")}
        actions={
          <Link href="/liabilities/new">
            <Button>{t("liabilities.add")}</Button>
          </Link>
        }
      />
      {notice ? (
        <Notice tone="success" className="mb-4">
          {notice}
        </Notice>
      ) : null}
      {liabilities.length === 0 ? (
        <EmptyState
          title={t("liabilities.empty")}
          description={t("liabilities.emptyHint")}
          action={
            <Link href="/liabilities/new">
              <Button>{t("liabilities.add")}</Button>
            </Link>
          }
        />
      ) : (
        <div className="border-border bg-surface overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface-2 text-fg-muted text-left text-xs tracking-wide uppercase">
              <tr>
                <th className="px-4 py-2 font-medium">{t("common.name")}</th>
                <th className="px-4 py-2 font-medium">{t("liabilities.type")}</th>
                <th className="px-4 py-2 font-medium">{t("liabilities.linkedAsset")}</th>
                <th className="px-4 py-2 text-right font-medium">
                  {t("liabilities.remainingAmount")}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {t("liabilities.interestRate")}
                </th>
                <th className="px-4 py-2 text-right font-medium">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {liabilities.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-medium">{l.name}</td>
                  <td className="text-fg-muted px-4 py-3">{messages.liabilities.types[l.type]}</td>
                  <td className="text-fg-muted px-4 py-3">
                    {l.linkedAssetId ? (assetNames.get(l.linkedAssetId) ?? "—") : "—"}
                  </td>
                  <td className="tabular px-4 py-3 text-right font-mono">
                    {summary.liabilityValues[l.id]
                      ? formatCurrency(summary.liabilityValues[l.id]!)
                      : t("common.unavailable")}
                  </td>
                  <td className="tabular text-fg-muted px-4 py-3 text-right font-mono">
                    {l.interestRateBps == null
                      ? "—"
                      : formatPercentage(l.interestRateBps, { signed: false })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        href={`/liabilities/${l.id}/edit`}
                        className="text-sm underline-offset-2 hover:underline"
                      >
                        {t("common.edit")}
                      </Link>
                      <DeleteLiabilityButton id={l.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
