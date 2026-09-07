import { z } from "zod";
import { ASSET_CATEGORIES, PROPERTY_TYPES, VALUATION_TYPES } from "@/config/categories";
import {
  currencySchema,
  isoDateSchema,
  nameSchema,
  nonNegativeCentsSchema,
  optionalCentsSchema,
  quantitySchema,
  shortTextSchema,
  tickerSchema,
  uuidSchema,
} from "./common";

export const realEstateDetailsSchema = z.object({
  propertyType: z.enum(PROPERTY_TYPES),
  purchasePriceCents: optionalCentsSchema,
  purchaseDate: isoDateSchema.nullable().optional(),
  location: shortTextSchema.max(120).nullable().optional(),
  monthlyRentCents: optionalCentsSchema,
});

export const assetInputSchema = z
  .object({
    category: z.enum(ASSET_CATEGORIES),
    subcategory: shortTextSchema.max(60).nullable().optional(),
    name: nameSchema,
    description: shortTextSchema.nullable().optional(),
    currency: currencySchema,
    /** Value entered by the user (MANUAL) or fallback (MARKET). */
    manualValueCents: nonNegativeCentsSchema,
    purchaseValueCents: optionalCentsSchema,
    quantity: quantitySchema.nullable().optional(),
    ticker: tickerSchema.nullable().optional(),
    valuationType: z.enum(VALUATION_TYPES).default("MANUAL"),
    realEstate: realEstateDetailsSchema.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.valuationType === "MARKET" && (!value.ticker || !value.quantity)) {
      ctx.addIssue({
        code: "custom",
        path: ["ticker"],
        message: "Ticker et quantité sont requis pour une valorisation de marché.",
      });
    }
    if (value.category === "REAL_ESTATE" && !value.realEstate) {
      ctx.addIssue({
        code: "custom",
        path: ["realEstate"],
        message: "Le type de bien est requis.",
      });
    }
  });

export type AssetInput = z.infer<typeof assetInputSchema>;

export const assetIdSchema = z.object({ id: uuidSchema });
