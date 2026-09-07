import { ASSET_CATEGORY_WORLD_MAPPING, NON_PRIMARY_REAL_ESTATE_BUILDING } from "@/config/districts";
import { buildingFootprint, buildingSpriteId } from "@/config/sprites";
import type { AssetCategory } from "@/config/categories";
import type { CurrencyCode } from "@/config/currencies";
import type { PropertyType } from "@/config/categories";
import { ratioBps } from "@/lib/money";
import type { WorldEntity } from "@/types/world";
import { getBuildingLevel, getNextLevelThreshold } from "./building-progression";

export interface WorldAssetInput {
  id: string;
  name: string;
  category: AssetCategory;
  /** Value converted into the reference currency. */
  valueCents: number;
  currency: CurrencyCode;
  propertyType?: PropertyType | null;
}

export interface WorldLiabilityInput {
  id: string;
  linkedAssetId: string | null;
  /** Converted remaining amount. */
  remainingCents: number;
}

/**
 * WealthToWorldService: FinancialAsset -> AssetCategory -> WorldEntity ->
 * BuildingType -> BuildingLevel -> Sprite. Pure and deterministic.
 */
export function mapAssetToWorldEntity(
  asset: WorldAssetInput,
  linked: readonly WorldLiabilityInput[] = [],
): WorldEntity {
  const mapping = ASSET_CATEGORY_WORLD_MAPPING[asset.category];
  const buildingType =
    asset.category === "REAL_ESTATE" &&
    asset.propertyType &&
    asset.propertyType !== "PRIMARY_RESIDENCE"
      ? NON_PRIMARY_REAL_ESTATE_BUILDING
      : mapping.building;
  const level = getBuildingLevel(buildingType, asset.valueCents);
  const linkedLiabilityIds = linked.filter((l) => l.linkedAssetId === asset.id).map((l) => l.id);
  const debt = linked
    .filter((l) => l.linkedAssetId === asset.id)
    .reduce((acc, l) => acc + l.remainingCents, 0);
  return {
    assetId: asset.id,
    assetCategory: asset.category,
    label: asset.name,
    district: mapping.district,
    buildingType,
    level,
    footprint: buildingFootprint(buildingType, level),
    spriteId: buildingSpriteId(buildingType, level),
    valueCents: asset.valueCents,
    currency: asset.currency,
    linkedLiabilityIds,
    debtRatioBps: linkedLiabilityIds.length ? ratioBps(debt, asset.valueCents) : null,
    nextLevelAtCents: getNextLevelThreshold(buildingType, level),
  };
}

export function mapAssetsToWorldEntities(
  assets: readonly WorldAssetInput[],
  liabilities: readonly WorldLiabilityInput[] = [],
): WorldEntity[] {
  return assets.map((asset) => mapAssetToWorldEntity(asset, liabilities));
}
