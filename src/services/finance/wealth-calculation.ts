import { ASSET_CATEGORY_FAMILY, type AssetCategory, type AssetFamily } from "@/config/categories";
import { REFERENCE_CURRENCY, type CurrencyCode } from "@/config/currencies";
import { add, money, subtract, zero, type Money } from "@/lib/money";
import { convertMoney, EMPTY_RATE_TABLE, type ExchangeRateTable } from "./currency-conversion";

/** Minimal shapes so the service stays independent from the persistence layer. */
export interface AssetLike {
  id: string;
  category: AssetCategory;
  currency: CurrencyCode;
  currentValueCents: number;
  purchaseValueCents?: number | null;
  isActive: boolean;
}

export interface LiabilityLike {
  id: string;
  currency: CurrencyCode;
  remainingAmountCents: number;
  linkedAssetId?: string | null;
}

export interface WealthCalculationOptions {
  currency?: CurrencyCode;
  rates?: ExchangeRateTable;
}

export interface WealthSummary {
  currency: CurrencyCode;
  grossAssets: Money;
  totalLiabilities: Money;
  netWorth: Money;
  byFamily: Record<AssetFamily, Money>;
  byCategory: Partial<Record<AssetCategory, Money>>;
  /** Converted value per asset id (active and convertible assets only). */
  assetValues: Record<string, Money>;
  /** Converted remaining amount per liability id. */
  liabilityValues: Record<string, Money>;
  assetCount: number;
  liabilityCount: number;
  /** Items excluded from totals because no exchange rate was available. */
  unconvertibleAssetIds: string[];
  unconvertibleLiabilityIds: string[];
}

function emptyByFamily(currency: CurrencyCode): Record<AssetFamily, Money> {
  return {
    REAL_ESTATE: zero(currency),
    LIQUIDITY: zero(currency),
    FINANCIAL: zero(currency),
    ALTERNATIVE: zero(currency),
  };
}

/**
 * WealthCalculationService — the single implementation of
 * gross assets, total liabilities and net worth.
 */
export function calculateGrossAssets(
  assets: readonly AssetLike[],
  options: WealthCalculationOptions = {},
): { total: Money; values: Record<string, Money>; unconvertible: string[] } {
  const currency = options.currency ?? REFERENCE_CURRENCY;
  const rates = options.rates ?? EMPTY_RATE_TABLE;
  let total = zero(currency);
  const values: Record<string, Money> = {};
  const unconvertible: string[] = [];
  for (const asset of assets) {
    if (!asset.isActive) continue;
    const converted = convertMoney(money(asset.currentValueCents, asset.currency), currency, rates);
    if (!converted) {
      unconvertible.push(asset.id);
      continue;
    }
    values[asset.id] = converted;
    total = add(total, converted);
  }
  return { total, values, unconvertible };
}

export function calculateLiabilities(
  liabilities: readonly LiabilityLike[],
  options: WealthCalculationOptions = {},
): { total: Money; values: Record<string, Money>; unconvertible: string[] } {
  const currency = options.currency ?? REFERENCE_CURRENCY;
  const rates = options.rates ?? EMPTY_RATE_TABLE;
  let total = zero(currency);
  const values: Record<string, Money> = {};
  const unconvertible: string[] = [];
  for (const liability of liabilities) {
    const converted = convertMoney(
      money(liability.remainingAmountCents, liability.currency),
      currency,
      rates,
    );
    if (!converted) {
      unconvertible.push(liability.id);
      continue;
    }
    values[liability.id] = converted;
    total = add(total, converted);
  }
  return { total, values, unconvertible };
}

export function calculateNetWorth(grossAssets: Money, totalLiabilities: Money): Money {
  return subtract(grossAssets, totalLiabilities);
}

export function calculateWealthSummary(
  assets: readonly AssetLike[],
  liabilities: readonly LiabilityLike[],
  options: WealthCalculationOptions = {},
): WealthSummary {
  const currency = options.currency ?? REFERENCE_CURRENCY;
  const gross = calculateGrossAssets(assets, options);
  const debts = calculateLiabilities(liabilities, options);
  const byFamily = emptyByFamily(currency);
  const byCategory: Partial<Record<AssetCategory, Money>> = {};
  for (const asset of assets) {
    const value = gross.values[asset.id];
    if (!value) continue;
    const family = ASSET_CATEGORY_FAMILY[asset.category];
    byFamily[family] = add(byFamily[family], value);
    byCategory[asset.category] = add(byCategory[asset.category] ?? zero(currency), value);
  }
  return {
    currency,
    grossAssets: gross.total,
    totalLiabilities: debts.total,
    netWorth: calculateNetWorth(gross.total, debts.total),
    byFamily,
    byCategory,
    assetValues: gross.values,
    liabilityValues: debts.values,
    assetCount: Object.keys(gross.values).length,
    liabilityCount: Object.keys(debts.values).length,
    unconvertibleAssetIds: gross.unconvertible,
    unconvertibleLiabilityIds: debts.unconvertible,
  };
}

/** Performance of an asset versus its purchase value, in basis points (null if unknown). */
export function calculatePerformanceBps(
  currentValueCents: number,
  purchaseValueCents: number | null | undefined,
): number | null {
  if (purchaseValueCents == null || purchaseValueCents <= 0) return null;
  return Math.round(((currentValueCents - purchaseValueCents) * 10_000) / purchaseValueCents);
}
