import { z } from "zod";
import { CURRENCY_CODES } from "@/config/currencies";

/**
 * Validation messages reach the visitor, so they are French like the rest of
 * the interface. Zod's built-in wording is English: an empty row used to answer
 * "Invalid input: expected string, received null". The schemas below still set
 * their own message where a specific one reads better.
 *
 * Set here because every form schema in the project imports this module.
 */
z.config(z.locales.fr());

export const uuidSchema = z.uuid();
export const currencySchema = z.enum(CURRENCY_CODES);

/** Integer minor units, non-negative, bounded to the safe integer range. */
export const nonNegativeCentsSchema = z
  // An empty field arrives as null and fails on the type before any refinement
  // runs, so the type itself carries the message a visitor should read.
  .number({ error: "Le montant est requis." })
  .int("Montant invalide.")
  .min(0, "Le montant doit être positif ou nul.")
  .max(Number.MAX_SAFE_INTEGER, "Montant trop élevé.");

export const optionalCentsSchema = nonNegativeCentsSchema.nullable().optional();

/** ISO date (YYYY-MM-DD). */
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ).");

export const nameSchema = z
  .string({ error: "Le nom est requis." })
  .trim()
  .min(1, "Le nom est requis.")
  .max(120, "Nom trop long.");
export const shortTextSchema = z.string({ error: "Texte invalide." }).trim().max(500, "Texte trop long.");
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
