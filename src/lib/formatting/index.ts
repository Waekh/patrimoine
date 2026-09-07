import { CURRENCY_MINOR_DIGITS } from "@/config/currencies";
import { DEFAULT_LOCALE, type Locale } from "@/config/locale";
import type { Money } from "@/lib/money";

export interface FormatCurrencyOptions {
  locale?: Locale;
  /** Show minor units (cents). Default: false (whole units, e.g. "102 430 €"). */
  withDecimals?: boolean;
  /** Prefix positive values with "+". */
  signed?: boolean;
}

/**
 * The only way to render a monetary value. Uses Intl with the French
 * conventions by default: "102 430 €".
 */
export function formatCurrency(value: Money, options: FormatCurrencyOptions = {}): string {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const digits = CURRENCY_MINOR_DIGITS[value.currency];
  const major = value.amountCents / 10 ** digits;
  const fractionDigits = options.withDecimals ? digits : 0;
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: value.currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    signDisplay: options.signed ? "exceptZero" : "auto",
  }).format(major);
  return formatted;
}

export interface FormatPercentageOptions {
  locale?: Locale;
  /** Default 2. */
  fractionDigits?: number;
  /** Default true: "+8,42 %". */
  signed?: boolean;
}

/** Formats basis points: 842 -> "+8,42 %". */
export function formatPercentage(bps: number, options: FormatPercentageOptions = {}): string {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const fractionDigits = options.fractionDigits ?? 2;
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    signDisplay: options.signed === false ? "auto" : "exceptZero",
  }).format(bps / 10_000);
}

export function formatDate(date: Date | string, locale: Locale = DEFAULT_LOCALE): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(d);
}

export function formatDateTime(date: Date | string, locale: Locale = DEFAULT_LOCALE): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export function formatQuantity(quantity: string, locale: Locale = DEFAULT_LOCALE): string {
  const n = Number(quantity);
  if (!Number.isFinite(n)) return quantity;
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 8 }).format(n);
}
