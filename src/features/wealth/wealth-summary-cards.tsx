import { Card } from "@/components/ui/card";
import { Metric } from "@/components/ui/metric";
import { formatCurrency } from "@/lib/formatting";
import { t } from "@/lib/i18n";
import type { WealthSummary } from "@/services/finance/wealth-calculation";
import type { WorldResources } from "@/types/world";
import { messages } from "@/lib/i18n";

export function WealthSummaryCards({
  summary,
  resources,
  deltaBps,
}: {
  summary: WealthSummary;
  resources: WorldResources;
  deltaBps: number | null;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="md:col-span-2">
        <Metric
          label={t("wealth.netWorth")}
          value={formatCurrency(summary.netWorth)}
          deltaBps={deltaBps}
          deltaLabel={deltaBps == null ? undefined : t("wealth.sinceLast")}
          size="lg"
        />
      </Card>
      <Card>
        <Metric label={t("wealth.grossAssets")} value={formatCurrency(summary.grossAssets)} />
      </Card>
      <Card>
        <Metric
          label={t("wealth.totalLiabilities")}
          value={formatCurrency(summary.totalLiabilities)}
        />
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-4 md:col-span-4">
        <div className="flex flex-col gap-1">
          <span className="text-fg-muted text-xs font-medium tracking-wide uppercase">
            {t("wealth.worldLevel")}
          </span>
          <span className="text-lg font-semibold">
            {messages.world.levels[resources.worldLevel]}
          </span>
          {resources.nextLevelAtCents != null ? (
            <span className="text-fg-muted text-xs">
              {t("world.nextLevelAt")}{" "}
              {formatCurrency({
                amountCents: resources.nextLevelAtCents,
                currency: summary.currency,
              })}
            </span>
          ) : (
            <span className="text-fg-muted text-xs">{t("world.maxLevel")}</span>
          )}
        </div>
        <div className="flex flex-col gap-1 text-right">
          <span className="text-fg-muted text-xs font-medium tracking-wide uppercase">
            {t("wealth.wealthScore")}
          </span>
          <span className="tabular font-mono text-lg font-semibold">
            {resources.wealthScore} / 1000
          </span>
          <span className="text-fg-muted text-xs">{t("wealth.wealthScoreHint")}</span>
        </div>
      </Card>
    </div>
  );
}
