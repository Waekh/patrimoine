import type { CurrencyCode } from "@/config/currencies";
import { seedFromString } from "@/services/world/seeded-random";
import type {
  ExchangeRate,
  HistoricalPrices,
  MarketDataError,
  MarketDataProvider,
  Quote,
} from "./types";

/**
 * MockMarketDataProvider: deterministic, clearly labelled ("mock") data for
 * development and tests. Never used in production and never displayed as a
 * real quote. Unknown tickers return UNKNOWN_TICKER like a real provider.
 */
const MOCK_QUOTES: Record<string, { currency: CurrencyCode; priceCents: number }> = {
  CW8: { currency: "EUR", priceCents: 52_412 },
  IWDA: { currency: "EUR", priceCents: 9_873 },
  VWCE: { currency: "EUR", priceCents: 12_140 },
  SPY: { currency: "USD", priceCents: 54_321 },
  BTC: { currency: "USD", priceCents: 6_412_000 },
  ETH: { currency: "USD", priceCents: 318_000 },
  "MC.PA": { currency: "EUR", priceCents: 64_280 },
  "AIR.PA": { currency: "EUR", priceCents: 16_412 },
};

const MOCK_RATES_TO_EUR_MICROS: Record<CurrencyCode, number> = {
  EUR: 1_000_000,
  USD: 920_000,
  GBP: 1_170_000,
  JPY: 6_100,
  CHF: 1_050_000,
  CAD: 680_000,
};

export class MockMarketDataProvider implements MarketDataProvider {
  readonly name = "mock";
  constructor(private readonly now: () => Date = () => new Date()) {}

  async getQuote(ticker: string): Promise<Quote | MarketDataError> {
    const entry = MOCK_QUOTES[ticker.toUpperCase()];
    if (!entry) return { code: "UNKNOWN_TICKER", provider: this.name };
    return {
      ticker: ticker.toUpperCase(),
      ...entry,
      timestamp: this.now(),
      provider: this.name,
      freshness: "mock",
    };
  }

  async getHistoricalPrices(
    ticker: string,
    from: Date,
    to: Date,
  ): Promise<HistoricalPrices | MarketDataError> {
    const entry = MOCK_QUOTES[ticker.toUpperCase()];
    if (!entry) return { code: "UNKNOWN_TICKER", provider: this.name };
    const prices: HistoricalPrices["prices"] = [];
    const seed = seedFromString(ticker.toUpperCase());
    const day = 86_400_000;
    let price = entry.priceCents;
    for (let t = to.getTime(); t >= from.getTime(); t -= day) {
      const dateStr = new Date(t).toISOString().slice(0, 10);
      prices.unshift({ date: dateStr, priceCents: price });
      // Deterministic pseudo-walk backwards in time (±0.4 %).
      const wobble = (((seed ^ Math.floor(t / day)) % 80) - 40) / 10_000;
      price = Math.max(1, Math.round(price * (1 - wobble)));
    }
    return {
      ticker: ticker.toUpperCase(),
      currency: entry.currency,
      prices,
      timestamp: this.now(),
      provider: this.name,
      freshness: "mock",
    };
  }

  async getExchangeRate(
    from: CurrencyCode,
    to: CurrencyCode,
  ): Promise<ExchangeRate | MarketDataError> {
    const fromEur = MOCK_RATES_TO_EUR_MICROS[from];
    const toEur = MOCK_RATES_TO_EUR_MICROS[to];
    if (!fromEur || !toEur) return { code: "UNSUPPORTED_CURRENCY", provider: this.name };
    // from -> EUR -> to, kept in integer micros.
    const rateMicros = Math.round((fromEur * 1_000_000) / toEur);
    return { from, to, rateMicros, timestamp: this.now(), provider: this.name, freshness: "mock" };
  }
}
