import { CURRENCY_MINOR_DIGITS, type CurrencyCode } from "@/config/currencies";

/**
 * A monetary amount in minor units (cents) with an explicit currency.
 * Amounts are integers; arithmetic never goes through floating point.
 */
export interface Money {
  amountCents: number;
  currency: CurrencyCode;
}

export function money(amountCents: number, currency: CurrencyCode): Money {
  assertIntegerCents(amountCents);
  return { amountCents, currency };
}

export function zero(currency: CurrencyCode): Money {
  return { amountCents: 0, currency };
}

export function assertIntegerCents(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Montant invalide (entier attendu en centimes) : ${String(value)}`);
  }
}

export function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Devises incompatibles : ${a.currency} / ${b.currency}`);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountCents + b.amountCents, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountCents - b.amountCents, a.currency);
}

export function sum(items: readonly Money[], currency: CurrencyCode): Money {
  return items.reduce<Money>((acc, item) => add(acc, item), zero(currency));
}

export function isNegative(m: Money): boolean {
  return m.amountCents < 0;
}

/** Converts a major-unit decimal string ("1234.56") into integer cents. */
export function parseMajorUnitsToCents(input: string, currency: CurrencyCode): number | null {
  const digits = CURRENCY_MINOR_DIGITS[currency];
  const normalized = input.replace(/\s/g, "").replace(/ /g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const negative = normalized.startsWith("-");
  const [intPart = "0", fracPart = ""] = normalized.replace("-", "").split(".");
  if (fracPart.length > digits) return null;
  const cents =
    BigInt(intPart) * 10n ** BigInt(digits) + BigInt(fracPart.padEnd(digits, "0") || "0");
  const signed = negative ? -cents : cents;
  if (signed > BigInt(Number.MAX_SAFE_INTEGER) || signed < BigInt(Number.MIN_SAFE_INTEGER))
    return null;
  return Number(signed);
}

/** Converts integer cents into a major-unit decimal string ("1234.56"), for inputs. */
export function centsToMajorUnitsString(amountCents: number, currency: CurrencyCode): string {
  assertIntegerCents(amountCents);
  const digits = CURRENCY_MINOR_DIGITS[currency];
  if (digits === 0) return String(amountCents);
  const abs = Math.abs(amountCents);
  const intPart = Math.floor(abs / 10 ** digits);
  const frac = String(abs % 10 ** digits).padStart(digits, "0");
  return `${amountCents < 0 ? "-" : ""}${intPart}.${frac}`;
}

/**
 * quantity (decimal string, up to 8 decimals) x unit price (cents) -> cents,
 * rounded half away from zero, computed with BigInt.
 */
export function multiplyQuantityByUnitPrice(
  quantity: string,
  unitPriceCents: number,
): number | null {
  assertIntegerCents(unitPriceCents);
  const normalized = quantity.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,8})?$/.test(normalized)) return null;
  const [intPart = "0", fracPart = ""] = normalized.split(".");
  const scaled = BigInt(intPart) * 100_000_000n + BigInt(fracPart.padEnd(8, "0") || "0");
  const product = scaled * BigInt(unitPriceCents);
  const divisor = 100_000_000n;
  const sign = product < 0n ? -1n : 1n;
  const absProduct = product < 0n ? -product : product;
  const rounded = (absProduct + divisor / 2n) / divisor;
  const result = sign * rounded;
  if (result > BigInt(Number.MAX_SAFE_INTEGER) || result < BigInt(Number.MIN_SAFE_INTEGER))
    return null;
  return Number(result);
}

/**
 * Ratio of two amounts in basis points (1 % = 100 bps), rounded to the
 * nearest bp. Returns null when the denominator is zero.
 */
export function ratioBps(numeratorCents: number, denominatorCents: number): number | null {
  if (denominatorCents === 0) return null;
  return Math.round((numeratorCents * 10_000) / denominatorCents);
}
