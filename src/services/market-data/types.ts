import type { CurrencyCode } from "@/config/currencies";

export const DATA_FRESHNESS = ["live", "delayed", "cached", "manual", "mock"] as const;
export type DataFreshness = (typeof DATA_FRESHNESS)[number];

export interface MarketDataMeta {
  timestamp: Date;
  provider: string;
  freshness: DataFreshness;
}

export interface Quote extends MarketDataMeta {
  ticker: string;
  currency: CurrencyCode;
  /** Price per unit in minor units of `currency`. */
  priceCents: number;
}

export interface HistoricalPrice {
  date: string;
  priceCents: number;
}

export interface HistoricalPrices extends MarketDataMeta {
  ticker: string;
  currency: CurrencyCode;
  prices: HistoricalPrice[];
}

export interface ExchangeRate extends MarketDataMeta {
  from: CurrencyCode;
  to: CurrencyCode;
  /** Rate scaled by 1e6 (1 EUR = 1.084321 USD -> 1_084_321). */
  rateMicros: number;
}

export type MarketDataErrorCode =
  | "UNKNOWN_TICKER"
  | "NO_DATA"
  | "STALE_DATA"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "MARKET_CLOSED"
  | "UNSUPPORTED_CURRENCY";

export interface MarketDataError {
  code: MarketDataErrorCode;
  provider: string;
}

/**
 * Every external market data source implements this. The application never
 * talks to a provider directly.
 */
export interface MarketDataProvider {
  readonly name: string;
  getQuote(ticker: string): Promise<Quote | MarketDataError>;
  getHistoricalPrices(
    ticker: string,
    from: Date,
    to: Date,
  ): Promise<HistoricalPrices | MarketDataError>;
  getExchangeRate(from: CurrencyCode, to: CurrencyCode): Promise<ExchangeRate | MarketDataError>;
}

export function isMarketDataError(value: unknown): value is MarketDataError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    !("priceCents" in value) &&
    !("rateMicros" in value) &&
    !("prices" in value)
  );
}
