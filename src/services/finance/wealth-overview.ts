import "server-only";
import { withUserDb, type UserTx } from "@/db/user-db";
import { listAssets } from "@/db/queries/assets";
import { listLiabilities } from "@/db/queries/liabilities";
import { REFERENCE_CURRENCY, type CurrencyCode } from "@/config/currencies";
import type { AssetWithDetails, Liability } from "@/types/domain";
import type { WorldState } from "@/types/world";
import { getMarketDataService } from "@/services/market-data/market-data-service";
import { mapAssetsToWorldEntities } from "@/services/world/wealth-to-world";
import { generateWorldState } from "@/services/world/world-generation";
import { loadAssetManifest } from "@/services/world/asset-manifest";
import type { ExchangeRateTable } from "./currency-conversion";
import { calculateWealthSummary, type WealthSummary } from "./wealth-calculation";
import { recordSnapshot } from "./snapshot-service";

export interface WealthOverview {
  assets: AssetWithDetails[];
  liabilities: Liability[];
  summary: WealthSummary;
  world: WorldState;
}

/** Computes the summary from records already loaded inside a user transaction. */
export async function computeSummary(
  assets: AssetWithDetails[],
  liabilities: Liability[],
  currency: CurrencyCode = REFERENCE_CURRENCY,
): Promise<WealthSummary> {
  const rates: ExchangeRateTable = await getMarketDataService().getRateTable(currency);
  return calculateWealthSummary(assets, liabilities, { currency, rates });
}

export function buildWorld(
  worldKey: string,
  assets: AssetWithDetails[],
  liabilities: Liability[],
  summary: WealthSummary,
): WorldState {
  const manifest = loadAssetManifest();
  const worldAssets = assets
    .filter((a) => a.isActive && summary.assetValues[a.id])
    .map((a) => ({
      id: a.id,
      name: a.name,
      category: a.category,
      valueCents: summary.assetValues[a.id]?.amountCents ?? 0,
      currency: summary.currency,
      propertyType: a.realEstate?.propertyType ?? null,
    }));
  const worldLiabilities = liabilities.map((l) => ({
    id: l.id,
    linkedAssetId: l.linkedAssetId,
    remainingCents: summary.liabilityValues[l.id]?.amountCents ?? 0,
  }));
  const entities = mapAssetsToWorldEntities(worldAssets, worldLiabilities);
  return generateWorldState({
    worldKey,
    summary,
    entities,
    usesPlaceholders: manifest.usesPlaceholders,
  });
}

/** Loads everything the dashboard and the world need for one user. */
export async function getWealthOverview(userId: string): Promise<WealthOverview> {
  return withUserDb(userId, async (tx) => {
    const [assets, liabilities] = await Promise.all([
      listAssets(tx, userId),
      listLiabilities(tx, userId),
    ]);
    const summary = await computeSummary(assets, liabilities);
    return {
      assets,
      liabilities,
      summary,
      world: buildWorld(userId, assets, liabilities, summary),
    };
  });
}

/** Recomputes the summary after a mutation and stores today's snapshot in the same transaction. */
export async function recalculateAndSnapshot(tx: UserTx, userId: string): Promise<WealthSummary> {
  const [assets, liabilities] = await Promise.all([
    listAssets(tx, userId),
    listLiabilities(tx, userId),
  ]);
  const summary = await computeSummary(assets, liabilities);
  await recordSnapshot(tx, userId, summary);
  return summary;
}
