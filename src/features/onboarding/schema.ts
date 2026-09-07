import { z } from "zod";
import {
  INCOME_FREQUENCIES,
  INCOME_TYPES,
  LIABILITY_TYPES,
  PROPERTY_TYPES,
} from "@/config/categories";
import {
  bpsSchema,
  currencySchema,
  isoDateSchema,
  nameSchema,
  nonNegativeCentsSchema,
  optionalCentsSchema,
  shortTextSchema,
  tickerSchema,
} from "@/lib/validation/common";
import { REFERENCE_CURRENCY } from "@/config/currencies";

const bool = z.boolean().default(false);

export const situationSchema = z.object({
  hasPrimaryResidence: bool,
  hasRealEstate: bool,
  hasBankAccounts: bool,
  hasSavings: bool,
  hasInvestments: bool,
  hasScpi: bool,
  hasCrypto: bool,
  hasOtherAssets: bool,
  hasLiabilities: bool,
  hasIncome: bool,
});

export const investmentsSchema = z.object({
  ETF: bool,
  STOCK: bool,
  PEA: bool,
  LIFE_INSURANCE: bool,
  PEE: bool,
});

export const primaryResidenceSchema = z.object({
  valueCents: nonNegativeCentsSchema,
  remainingDebtCents: optionalCentsSchema,
  monthlyPaymentCents: optionalCentsSchema,
  purchasePriceCents: optionalCentsSchema,
  purchaseDate: isoDateSchema.nullable().optional(),
  location: shortTextSchema.max(120).nullable().optional(),
});

export const simpleAssetItemSchema = z.object({
  name: nameSchema,
  valueCents: nonNegativeCentsSchema,
  purchaseValueCents: optionalCentsSchema,
  ticker: tickerSchema.nullable().optional(),
  currency: currencySchema.default(REFERENCE_CURRENCY),
});
export type SimpleAssetItem = z.infer<typeof simpleAssetItemSchema>;

export const realEstateItemSchema = z.object({
  name: nameSchema,
  propertyType: z.enum(PROPERTY_TYPES).default("RENTAL"),
  valueCents: nonNegativeCentsSchema,
  remainingDebtCents: optionalCentsSchema,
  monthlyRentCents: optionalCentsSchema,
  currency: currencySchema.default(REFERENCE_CURRENCY),
});
export type RealEstateItem = z.infer<typeof realEstateItemSchema>;

export const liabilityItemSchema = z.object({
  name: nameSchema,
  type: z.enum(LIABILITY_TYPES).default("CONSUMER_LOAN"),
  initialAmountCents: nonNegativeCentsSchema,
  remainingAmountCents: nonNegativeCentsSchema,
  monthlyPaymentCents: optionalCentsSchema,
  interestRateBps: bpsSchema.nullable().optional(),
  currency: currencySchema.default(REFERENCE_CURRENCY),
});
export type LiabilityItem = z.infer<typeof liabilityItemSchema>;

export const incomeItemSchema = z.object({
  name: nameSchema,
  type: z.enum(INCOME_TYPES).default("SALARY"),
  amountCents: nonNegativeCentsSchema,
  frequency: z.enum(INCOME_FREQUENCIES).default("MONTHLY"),
  currency: currencySchema.default(REFERENCE_CURRENCY),
});
export type IncomeItem = z.infer<typeof incomeItemSchema>;

const list = <T extends z.ZodTypeAny>(item: T) => z.array(item).max(50).default([]);

/** Draft answers of the questionnaire. Every section has a default so partial saves parse. */
export const onboardingAnswersSchema = z.object({
  situation: situationSchema.prefault({}),
  investments: investmentsSchema.prefault({}),
  primaryResidence: primaryResidenceSchema.nullable().default(null),
  realEstate: list(realEstateItemSchema),
  bankAccounts: list(simpleAssetItemSchema),
  savings: list(simpleAssetItemSchema),
  etf: list(simpleAssetItemSchema),
  stocks: list(simpleAssetItemSchema),
  pea: list(simpleAssetItemSchema),
  lifeInsurance: list(simpleAssetItemSchema),
  pee: list(simpleAssetItemSchema),
  scpi: list(simpleAssetItemSchema),
  crypto: list(simpleAssetItemSchema),
  otherAssets: list(simpleAssetItemSchema),
  liabilities: list(liabilityItemSchema),
  income: list(incomeItemSchema),
});

export type OnboardingAnswers = z.infer<typeof onboardingAnswersSchema>;

export function parseAnswers(value: unknown): OnboardingAnswers {
  const parsed = onboardingAnswersSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : onboardingAnswersSchema.parse({});
}
