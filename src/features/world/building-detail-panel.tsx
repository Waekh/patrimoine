import Link from "next/link";
import { Panel } from "@/components/ui/card";
import { Metric } from "@/components/ui/metric";
import { formatCurrency } from "@/lib/formatting";
import { messages, t } from "@/lib/i18n";
import { calculatePerformanceBps } from "@/services/finance/wealth-calculation";
import type { WorldBuilding } from "@/types/world";
import type { AssetWithDetails, Liability } from "@/types/domain";

export interface BuildingDetailPanelProps {
  building: WorldBuilding;
  asset: AssetWithDetails | null;
  linkedLiabilities: Liability[];
  onClose: () => void;
  readOnly?: boolean;
  className?: string;
}

/** Compact, readable detail of the asset behind a building (building -> asset mapping). */
export function BuildingDetailPanel({
  building,
  asset,
  linkedLiabilities,
  onClose,
  readOnly = false,
  className,
}: BuildingDetailPanelProps) {
  const value = { amountCents: building.valueCents, currency: building.currency };
  const perf = asset
    ? calculatePerformanceBps(asset.currentValueCents, asset.purchaseValueCents)
    : null;
  const gain =
    asset?.purchaseValueCents != null ? asset.currentValueCents - asset.purchaseValueCents : null;
  return (
    <Panel
      title={building.label}
      onClose={onClose}
      closeLabel={t("common.close")}
      className={className}
    >
      <div className="flex flex-col gap-4">
        <p className="text-fg-muted text-xs">
          {messages.world.buildings[building.type]} ·{" "}
          {messages.assets.categories[building.assetCategory]} ·{" "}
          {messages.world.districts[building.district]}
        </p>
        <Metric
          label={t("assets.currentValue")}
          value={formatCurrency(value)}
          deltaBps={perf}
          size="lg"
        />
        {asset?.purchaseValueCents != null ? (
          <div className="grid grid-cols-2 gap-3">
            <Metric
              label={t("wealth.invested")}
              value={formatCurrency({
                amountCents: asset.purchaseValueCents,
                currency: asset.currency,
              })}
            />
            <Metric
              label={t("wealth.performance")}
              value={
                gain == null
                  ? "—"
                  : formatCurrency(
                      { amountCents: gain, currency: asset.currency },
                      { signed: true },
                    )
              }
            />
          </div>
        ) : null}
        {asset?.valuationType === "MARKET" ? (
          <p className="text-fg-muted text-xs">
            {asset.valuedAt
              ? `${t("assets.valuationMarket")} · ${asset.provider ?? ""}`
              : t("common.unavailable")}
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-fg-muted text-xs tracking-wide uppercase">
              {t("world.buildingLevel")}
            </p>
            <p className="tabular font-mono font-medium">{building.level} / 5</p>
          </div>
          <div>
            <p className="text-fg-muted text-xs tracking-wide uppercase">
              {building.nextLevelAtCents == null ? t("world.maxLevel") : t("world.nextLevelAt")}
            </p>
            <p className="tabular font-mono font-medium">
              {building.nextLevelAtCents == null
                ? "—"
                : formatCurrency({
                    amountCents: building.nextLevelAtCents,
                    currency: building.currency,
                  })}
            </p>
          </div>
        </div>
        {linkedLiabilities.length > 0 ? (
          <div className="border-ink bg-surface-2 flex flex-col gap-1 rounded-md border-2 p-3 text-sm">
            <p className="text-fg-muted text-xs tracking-wide uppercase">{t("world.linkedDebt")}</p>
            {linkedLiabilities.map((l) => (
              <div key={l.id} className="flex justify-between gap-3">
                <span className="truncate">{l.name}</span>
                <span className="tabular font-mono">
                  {formatCurrency({ amountCents: l.remainingAmountCents, currency: l.currency })}
                </span>
              </div>
            ))}
          </div>
        ) : null}
        {!readOnly && asset ? (
          <Link
            href={`/assets/${asset.id}/edit`}
            className="text-sm font-medium underline-offset-2 hover:underline"
          >
            {t("world.openAsset")}
          </Link>
        ) : null}
      </div>
    </Panel>
  );
}
