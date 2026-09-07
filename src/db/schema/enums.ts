import { pgEnum } from "drizzle-orm/pg-core";
import {
  ASSET_CATEGORIES,
  INCOME_FREQUENCIES,
  INCOME_TYPES,
  LIABILITY_TYPES,
  PROPERTY_TYPES,
  VALUATION_TYPES,
} from "@/config/categories";
import { CURRENCY_CODES } from "@/config/currencies";

export const assetCategoryEnum = pgEnum("asset_category", ASSET_CATEGORIES);
export const propertyTypeEnum = pgEnum("property_type", PROPERTY_TYPES);
export const liabilityTypeEnum = pgEnum("liability_type", LIABILITY_TYPES);
export const incomeTypeEnum = pgEnum("income_type", INCOME_TYPES);
export const incomeFrequencyEnum = pgEnum("income_frequency", INCOME_FREQUENCIES);
export const valuationTypeEnum = pgEnum("valuation_type", VALUATION_TYPES);
export const currencyCodeEnum = pgEnum("currency_code", CURRENCY_CODES);
