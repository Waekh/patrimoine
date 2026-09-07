/**
 * Central registry of every domain enum. Nothing else in the codebase may
 * spell these values as loose strings.
 */

export const ASSET_CATEGORIES = [
  "REAL_ESTATE",
  "CASH",
  "SAVINGS",
  "ETF",
  "STOCK",
  "BOND",
  "PEA",
  "CTO",
  "LIFE_INSURANCE",
  "PEE",
  "SCPI",
  "CRYPTO",
  "VEHICLE",
  "COLLECTIBLE",
  "OTHER",
] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export const PROPERTY_TYPES = [
  "PRIMARY_RESIDENCE",
  "RENTAL",
  "SECOND_HOME",
  "COMMERCIAL",
  "PARKING",
  "OTHER",
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const LIABILITY_TYPES = [
  "MORTGAGE",
  "CONSUMER_LOAN",
  "STUDENT_LOAN",
  "PERSONAL_LOAN",
  "OTHER",
] as const;
export type LiabilityType = (typeof LIABILITY_TYPES)[number];

export const INCOME_TYPES = [
  "SALARY",
  "RENT",
  "DIVIDENDS",
  "INTEREST",
  "BUSINESS",
  "OTHER",
] as const;
export type IncomeType = (typeof INCOME_TYPES)[number];

export const INCOME_FREQUENCIES = ["MONTHLY", "YEARLY", "IRREGULAR"] as const;
export type IncomeFrequency = (typeof INCOME_FREQUENCIES)[number];

export const VALUATION_TYPES = ["MANUAL", "MARKET"] as const;
export type ValuationType = (typeof VALUATION_TYPES)[number];

/** Categories whose value can be derived from a market quote (quantity x price). */
export const MARKET_VALUABLE_CATEGORIES: readonly AssetCategory[] = [
  "ETF",
  "STOCK",
  "CRYPTO",
  "BOND",
];

/** Asset "families" used for allocation charts and world districts. */
export const ASSET_FAMILIES = ["REAL_ESTATE", "LIQUIDITY", "FINANCIAL", "ALTERNATIVE"] as const;
export type AssetFamily = (typeof ASSET_FAMILIES)[number];

export const ASSET_CATEGORY_FAMILY: Record<AssetCategory, AssetFamily> = {
  REAL_ESTATE: "REAL_ESTATE",
  SCPI: "REAL_ESTATE",
  CASH: "LIQUIDITY",
  SAVINGS: "LIQUIDITY",
  ETF: "FINANCIAL",
  STOCK: "FINANCIAL",
  BOND: "FINANCIAL",
  PEA: "FINANCIAL",
  CTO: "FINANCIAL",
  LIFE_INSURANCE: "FINANCIAL",
  PEE: "FINANCIAL",
  CRYPTO: "ALTERNATIVE",
  VEHICLE: "ALTERNATIVE",
  COLLECTIBLE: "ALTERNATIVE",
  OTHER: "ALTERNATIVE",
};

export function isAssetCategory(value: unknown): value is AssetCategory {
  return typeof value === "string" && (ASSET_CATEGORIES as readonly string[]).includes(value);
}
