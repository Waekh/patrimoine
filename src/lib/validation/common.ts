import { z } from "zod";
import { CURRENCY_CODES } from "@/config/currencies";

export const uuidSchema = z.uuid();
export const currencySchema = z.enum(CURRENCY_CODES);

/** Integer minor units, non-negative, bounded to the safe integer range. */
export const nonNegativeCentsSchema = z
  .number()
  .int("Montant invalide.")
  .min(0, "Le montant doit être positif ou nul.")
  .max(Number.MAX_SAFE_INTEGER, "Montant trop élevé.");

export const optionalCentsSchema = nonNegativeCentsSchema.nullable().optional();

/** ISO date (YYYY-MM-DD). */
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ).");

export const nameSchema = z.string().trim().min(1, "Le nom est requis.").max(120, "Nom trop long.");
export const shortTextSchema = z.string().trim().max(500, "Texte trop long.");
export const tickerSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9.\-]{1,16}$/, "Ticker invalide.");
export const quantitySchema = z
  .string()
  .trim()
  .regex(/^\d+([.,]\d{1,8})?$/, "Quantité invalide.");
/** Basis points: 0 .. 100 % */
export const bpsSchema = z.number().int().min(0).max(1_000_000);

export function fieldErrorsFromZod(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
