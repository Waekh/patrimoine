import type { CurrencyCode } from "@/config/currencies";
import { assertIntegerCents, type Money } from "@/lib/money";
import type { ExchangeRate } from "@/services/market-data/types";

/** Lookup table keyed by "FROM:TO". Built by MarketDataService, consumed by pure services. */
export type ExchangeRateTable = ReadonlyMap<string, ExchangeRate>;

export function rateKey(from: CurrencyCode, to: CurrencyCode): string {
  return `${from}:${to}`;
}

export function buildRateTable(rates: readonly ExchangeRate[]): ExchangeRateTable {
  const map = new Map<string, ExchangeRate>();
  for (const rate of rates) map.set(rateKey(rate.from, rate.to), rate);
  return map;
}

export const EMPTY_RATE_TABLE: ExchangeRateTable = new Map();

/**
 * Converts `value` into `target`. Returns null when no rate is available:
 * callers must surface "non convertible" rather than guess a rate.
 * Integer arithmetic (BigInt) with half-up rounding.
 */
export function convertMoney(
  value: Money,
  target: CurrencyCode,
  rates: ExchangeRateTable,
): Money | null {
  assertIntegerCents(value.amountCents);
  if (value.currency === target) return value;
  const rate = rates.get(rateKey(value.currency, target));
  if (!rate) return null;
  const product = BigInt(value.amountCents) * BigInt(rate.rateMicros);
  const divisor = 1_000_000n;
  const sign = product < 0n ? -1n : 1n;
  const abs = product < 0n ? -product : product;
  const rounded = sign * ((abs + divisor / 2n) / divisor);
  if (rounded > BigInt(Number.MAX_SAFE_INTEGER) || rounded < BigInt(Number.MIN_SAFE_INTEGER))
    return null;
  return { amountCents: Number(rounded), currency: target };
}
