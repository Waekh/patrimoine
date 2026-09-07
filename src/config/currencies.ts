export const CURRENCY_CODES = ["EUR", "USD", "GBP", "JPY", "CHF", "CAD"] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

/** Reference currency used for aggregation in the MVP. */
export const REFERENCE_CURRENCY: CurrencyCode = "EUR";

/**
 * Number of minor-unit digits per currency. Amounts are stored as integers in
 * the minor unit ("cents"); JPY has no minor unit.
 */
export const CURRENCY_MINOR_DIGITS: Record<CurrencyCode, number> = {
  EUR: 2,
  USD: 2,
  GBP: 2,
  JPY: 0,
  CHF: 2,
  CAD: 2,
};

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && (CURRENCY_CODES as readonly string[]).includes(value);
}
