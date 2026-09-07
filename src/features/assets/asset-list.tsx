import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { formatCurrency, formatDateTime } from "@/lib/formatting";
import { messages, t } from "@/lib/i18n";
import type { AssetWithDetails } from "@/types/domain";
import type { Money } from "@/lib/money";
import { calculatePerformanceBps } from "@/services/finance/wealth-calculation";
import { formatPercentage } from "@/lib/formatting";
import { DeleteAssetButton } from "./delete-asset-button";

export function AssetList({
  assets,
  values,
}: {
  assets: AssetWithDetails[];
  values: Record<string, Money>;
}) {
  if (assets.length === 0) {
    return (
      <EmptyState
        title={t("assets.empty")}
        description={t("assets.emptyHint")}
        action={
          <Link href="/assets/new">
            <Button>{t("assets.add")}</Button>
          </Link>
        }
      />
    );
  }
  return (
    <div className="border-border bg-surface overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-surface-2 text-fg-muted text-left text-xs tracking-wide uppercase">
          <tr>
            <th className="px-4 py-2 font-medium">{t("common.name")}</th>
            <th className="px-4 py-2 font-medium">{t("assets.category")}</th>
            <th className="px-4 py-2 text-right font-medium">{t("assets.currentValue")}</th>
            <th className="px-4 py-2 text-right font-medium">{t("wealth.performance")}</th>
            <th className="px-4 py-2 text-right font-medium">{t("common.actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {assets.map((a) => {
            const value = values[a.id];
            const perf = calculatePerformanceBps(a.currentValueCents, a.purchaseValueCents);
            return (
              <tr key={a.id}>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium">{a.name}</span>
                    <span className="text-fg-muted text-xs">
                      {a.valuationType === "MARKET"
                        ? a.valuedAt
                          ? `${t("assets.valuedAt")} ${formatDateTime(a.valuedAt)} · ${a.provider ?? ""}`
                          : t("common.unavailable")
                        : t("assets.valuationManual")}
                      {a.isActive ? "" : ` · ${t("assets.inactive")}`}
                    </span>
                  </div>
                </td>
                <td className="text-fg-muted px-4 py-3">
                  {messages.assets.categories[a.category]}
                  {a.realEstate
                    ? ` · ${messages.assets.propertyTypes[a.realEstate.propertyType]}`
                    : ""}
                </td>
                <td className="tabular px-4 py-3 text-right font-mono">
                  {value
                    ? formatCurrency(value)
                    : `${formatCurrency({ amountCents: a.currentValueCents, currency: a.currency })} (${t("common.unavailable")})`}
                </td>
                <td
                  className={`tabular px-4 py-3 text-right font-mono ${perf == null ? "text-fg-muted" : perf > 0 ? "text-positive" : perf < 0 ? "text-negative" : ""}`}
                >
                  {perf == null ? "—" : formatPercentage(perf)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <Link
                      href={`/assets/${a.id}/edit`}
                      className="text-sm underline-offset-2 hover:underline"
                    >
                      {t("common.edit")}
                    </Link>
                    <DeleteAssetButton id={a.id} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
