import type { AssetWithDetails, Liability } from "@/types/domain";

/**
 * Fictional demonstration patrimony (PRODUCT_SPEC §121). Used by /demo and
 * the development seed. No real data.
 */
export const DEMO_USER = {
  id: "00000000-0000-4000-8000-00000000d3a0",
  email: "demo@patrimoine.local",
  password: "demo-patrimoine-2026",
} as const;

const now = new Date("2026-01-15T10:00:00Z");
const base = {
  userId: DEMO_USER.id,
  description: null,
  subcategory: null,
  quantity: null,
  unitPriceCents: null,
  ticker: null,
  provider: null,
  valuedAt: null,
  isActive: true,
  createdAt: now,
  updatedAt: now,
} as const;

export const DEMO_ASSETS: AssetWithDetails[] = [
  {
    ...base,
    id: "00000000-0000-4000-8000-0000000000a1",
    category: "REAL_ESTATE",
    name: "Résidence principale",
    currency: "EUR",
    currentValueCents: 40_000_000,
    manualValueCents: 40_000_000,
    purchaseValueCents: 32_000_000,
    valuationType: "MANUAL",
    realEstate: {
      assetId: "00000000-0000-4000-8000-0000000000a1",
      userId: DEMO_USER.id,
      propertyType: "PRIMARY_RESIDENCE",
      purchasePriceCents: 32_000_000,
      purchaseDate: "2019-06-01",
      location: null,
      monthlyRentCents: null,
      createdAt: now,
      updatedAt: now,
    },
  },
  {
    ...base,
    id: "00000000-0000-4000-8000-0000000000a2",
    category: "ETF",
    name: "ETF MSCI World",
    currency: "EUR",
    currentValueCents: 10_000_000,
    manualValueCents: 10_000_000,
    purchaseValueCents: 8_500_000,
    valuationType: "MANUAL",
    ticker: "CW8",
    realEstate: null,
  },
  {
    ...base,
    id: "00000000-0000-4000-8000-0000000000a3",
    category: "CASH",
    name: "Compte courant",
    currency: "EUR",
    currentValueCents: 3_000_000,
    manualValueCents: 3_000_000,
    purchaseValueCents: null,
    valuationType: "MANUAL",
    realEstate: null,
  },
  {
    ...base,
    id: "00000000-0000-4000-8000-0000000000a4",
    category: "SCPI",
    name: "SCPI Rendement",
    currency: "EUR",
    currentValueCents: 8_000_000,
    manualValueCents: 8_000_000,
    purchaseValueCents: 7_600_000,
    valuationType: "MANUAL",
    realEstate: null,
  },
];

export const DEMO_LIABILITIES: Liability[] = [
  {
    id: "00000000-0000-4000-8000-0000000000b1",
    userId: DEMO_USER.id,
    type: "MORTGAGE",
    name: "Crédit immobilier",
    currency: "EUR",
    initialAmountCents: 30_000_000,
    remainingAmountCents: 25_000_000,
    interestRateBps: 145,
    monthlyPaymentCents: 125_000,
    startDate: "2019-06-01",
    endDate: "2044-06-01",
    linkedAssetId: "00000000-0000-4000-8000-0000000000a1",
    createdAt: now,
    updatedAt: now,
  },
];
