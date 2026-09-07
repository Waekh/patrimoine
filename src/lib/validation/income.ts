import { z } from "zod";
import { INCOME_FREQUENCIES, INCOME_TYPES } from "@/config/categories";
import { currencySchema, nameSchema, nonNegativeCentsSchema } from "./common";

export const incomeInputSchema = z.object({
  type: z.enum(INCOME_TYPES),
  name: nameSchema,
  currency: currencySchema,
  amountCents: nonNegativeCentsSchema,
  frequency: z.enum(INCOME_FREQUENCIES),
});

export type IncomeInput = z.infer<typeof incomeInputSchema>;
