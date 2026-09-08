import type { AssetCategory, PropertyType } from "@/config/categories";
import type { AssetWithDetails, Liability } from "@/types/domain";

/**
 * Fictional portfolio used by the public home page. It is deliberately broad:
 * every building type and every level appears at least once, so the landscape
 * shows what the world engine can render. No real data, never persisted.
 */
const OWNER = "00000000-0000-4000-8000-00000000e5c0";
const AT = new Date("2026-01-15T10:00:00Z");

interface ShowcaseAsset {
  name: string;
  category: AssetCategory;
  /** In euros, converted to cents below. */
  value: number;
  invested?: number;
  propertyType?: PropertyType;
}

const ASSETS: ShowcaseAsset[] = [
  // Quartier résidentiel : maison puis immeubles, du studio à l'immeuble de rapport.
  {
    name: "Résidence principale",
    category: "REAL_ESTATE",
    value: 620_000,
    invested: 480_000,
    propertyType: "PRIMARY_RESIDENCE",
  },
  {
    name: "Immeuble de rapport, Lille",
    category: "REAL_ESTATE",
    value: 850_000,
    invested: 720_000,
    propertyType: "RENTAL",
  },
  {
    name: "Maison de famille",
    category: "REAL_ESTATE",
    value: 410_000,
    invested: 350_000,
    propertyType: "SECOND_HOME",
  },
  {
    name: "Appartement locatif, Lyon",
    category: "REAL_ESTATE",
    value: 285_000,
    invested: 240_000,
    propertyType: "RENTAL",
  },
  {
    name: "Studio étudiant, Rennes",
    category: "REAL_ESTATE",
    value: 96_000,
    invested: 88_000,
    propertyType: "RENTAL",
  },
  {
    name: "Parking, Bordeaux",
    category: "REAL_ESTATE",
    value: 32_000,
    invested: 28_000,
    propertyType: "PARKING",
  },

  // Quartier immobilier : parts de SCPI.
  { name: "SCPI Santé", category: "SCPI", value: 310_000, invested: 295_000 },
  { name: "SCPI Rendement", category: "SCPI", value: 145_000, invested: 138_000 },
  { name: "SCPI Europe", category: "SCPI", value: 62_000, invested: 60_000 },

  // Quartier bancaire : comptes et épargne.
  { name: "Compte à terme", category: "SAVINGS", value: 160_000 },
  { name: "Compte joint", category: "CASH", value: 34_000 },
  { name: "Livret A", category: "SAVINGS", value: 22_950 },
  { name: "Compte courant", category: "CASH", value: 8_400 },

  // Quartier financier : enveloppes et titres.
  { name: "PEA", category: "PEA", value: 310_000, invested: 245_000 },
  { name: "Compte-titres", category: "CTO", value: 245_000, invested: 210_000 },
  { name: "ETF MSCI World", category: "ETF", value: 128_000, invested: 96_000 },
  { name: "Actions en direct", category: "STOCK", value: 96_000, invested: 84_000 },
  { name: "Assurance-vie", category: "LIFE_INSURANCE", value: 76_000, invested: 70_000 },
  { name: "Obligations d'État", category: "BOND", value: 54_000, invested: 54_000 },
  { name: "ETF S&P 500", category: "ETF", value: 41_000, invested: 32_000 },
  { name: "PEE", category: "PEE", value: 18_500, invested: 15_000 },

  // Quartier alternatif : actifs divers.
  { name: "Œuvres d'art", category: "OTHER", value: 165_000, invested: 140_000 },
  { name: "Bitcoin", category: "CRYPTO", value: 47_000, invested: 22_000 },
  { name: "Voiture de collection", category: "VEHICLE", value: 28_000, invested: 31_000 },
  { name: "Montres", category: "COLLECTIBLE", value: 9_000, invested: 8_200 },
];

function identifier(index: number): string {
  return `00000000-0000-4000-8000-0000000${(index + 100).toString().padStart(5, "0")}`;
}

export const SHOWCASE_ASSETS: AssetWithDetails[] = ASSETS.map((item, index) => {
  const id = identifier(index);
  return {
    id,
    userId: OWNER,
    category: item.category,
    subcategory: null,
    name: item.name,
    description: null,
    currency: "EUR",
    currentValueCents: item.value * 100,
    purchaseValueCents: item.invested === undefined ? null : item.invested * 100,
    quantity: null,
    unitPriceCents: null,
    ticker: null,
    provider: null,
    valuationType: "MANUAL",
    manualValueCents: item.value * 100,
    valuedAt: null,
    isActive: true,
    createdAt: AT,
    updatedAt: AT,
    realEstate: item.propertyType
      ? {
          assetId: id,
          userId: OWNER,
          propertyType: item.propertyType,
          purchasePriceCents: item.invested === undefined ? null : item.invested * 100,
          purchaseDate: null,
          location: null,
          monthlyRentCents: null,
          createdAt: AT,
          updatedAt: AT,
        }
      : null,
  };
});

/** Linked to the first two properties, so a couple of buildings carry a debt. */
export const SHOWCASE_LIABILITIES: Liability[] = [
  ["Crédit résidence principale", 240_000, identifier(0)],
  ["Crédit immeuble, Lille", 380_000, identifier(1)],
].map(([name, remaining, linkedAssetId], index) => ({
  id: `00000000-0000-4000-8000-0000000${(index + 900).toString().padStart(5, "0")}`,
  userId: OWNER,
  type: "MORTGAGE" as const,
  name: name as string,
  currency: "EUR" as const,
  initialAmountCents: (remaining as number) * 130,
  remainingAmountCents: (remaining as number) * 100,
  interestRateBps: 145,
  monthlyPaymentCents: 120_000,
  startDate: null,
  endDate: null,
  linkedAssetId: linkedAssetId as string,
  createdAt: AT,
  updatedAt: AT,
}));
