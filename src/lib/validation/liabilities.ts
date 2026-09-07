import { z } from "zod";
import { LIABILITY_TYPES } from "@/config/categories";
import {
  bpsSchema,
  currencySchema,
  isoDateSchema,
  nameSchema,
  nonNegativeCentsSchema,
  optionalCentsSchema,
  uuidSchema,
} from "./common";

export const liabilityInputSchema = z
  .object({
    type: z.enum(LIABILITY_TYPES),
    name: nameSchema,
    currency: currencySchema,
    initialAmountCents: nonNegativeCentsSchema,
    remainingAmountCents: nonNegativeCentsSchema,
    interestRateBps: bpsSchema.nullable().optional(),
    monthlyPaymentCents: optionalCentsSchema,
    startDate: isoDateSchema.nullable().optional(),
    endDate: isoDateSchema.nullable().optional(),
    linkedAssetId: uuidSchema.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.startDate && value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "La date de fin doit suivre la date de début.",
      });
    }
  });

export type LiabilityInput = z.infer<typeof liabilityInputSchema>;

export const liabilityIdSchema = z.object({ id: uuidSchema });
