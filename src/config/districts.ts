import type { AssetCategory } from "./categories";
import type { BuildingType } from "./building-levels";

export const DISTRICT_IDS = [
  "HOME_DISTRICT",
  "FINANCE_DISTRICT",
  "REAL_ESTATE_DISTRICT",
  "CASH_DISTRICT",
  "ALTERNATIVE_DISTRICT",
] as const;
export type DistrictId = (typeof DISTRICT_IDS)[number];

/**
 * Mapping AssetCategory -> (district, building type). The world engine reads
 * this table; it never inspects category strings itself.
 */
export const ASSET_CATEGORY_WORLD_MAPPING: Record<
  AssetCategory,
  { district: DistrictId; building: BuildingType }
> = {
  REAL_ESTATE: { district: "HOME_DISTRICT", building: "HOUSE" },
  SCPI: { district: "REAL_ESTATE_DISTRICT", building: "REAL_ESTATE_BUILDING" },
  CASH: { district: "CASH_DISTRICT", building: "BANK" },
  SAVINGS: { district: "CASH_DISTRICT", building: "VAULT" },
  ETF: { district: "FINANCE_DISTRICT", building: "FINANCIAL_BUILDING" },
  STOCK: { district: "FINANCE_DISTRICT", building: "MARKET" },
  BOND: { district: "FINANCE_DISTRICT", building: "FINANCIAL_BUILDING" },
  PEA: { district: "FINANCE_DISTRICT", building: "FINANCIAL_BUILDING" },
  CTO: { district: "FINANCE_DISTRICT", building: "MARKET" },
  LIFE_INSURANCE: { district: "FINANCE_DISTRICT", building: "FINANCIAL_BUILDING" },
  PEE: { district: "FINANCE_DISTRICT", building: "FINANCIAL_BUILDING" },
  CRYPTO: { district: "ALTERNATIVE_DISTRICT", building: "WAREHOUSE" },
  VEHICLE: { district: "ALTERNATIVE_DISTRICT", building: "WAREHOUSE" },
  COLLECTIBLE: { district: "ALTERNATIVE_DISTRICT", building: "WAREHOUSE" },
  OTHER: { district: "ALTERNATIVE_DISTRICT", building: "WAREHOUSE" },
};

/** Non primary-residence real estate becomes an apartment building. */
export const NON_PRIMARY_REAL_ESTATE_BUILDING: BuildingType = "APARTMENT";

/**
 * Emblem carried by the buildings of a district. It says what the block holds
 * where the silhouette alone cannot: a bank and a vault are abstract, a house
 * and a warehouse are not. Characters come from the sign font, so the generator
 * can blit them straight onto a facade.
 *
 * Only buildings with enough wall to carry it are marked, which is why the
 * anchor of a block wears the emblem and its small neighbours do not.
 */
export const DISTRICT_EMBLEM: Record<DistrictId, string | null> = {
  HOME_DISTRICT: null,
  CASH_DISTRICT: "€",
  FINANCE_DISTRICT: "%",
  REAL_ESTATE_DISTRICT: null,
  ALTERNATIVE_DISTRICT: null,
};
