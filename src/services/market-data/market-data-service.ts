import { CURRENCY_CODES, REFERENCE_CURRENCY, type CurrencyCode } from "@/config/currencies";
import { buildRateTable, type ExchangeRateTable } from "@/services/finance/currency-conversion";
import { MockMarketDataProvider } from "./mock-provider";
import {
  isMarketDataError,
  type ExchangeRate,
  type MarketDataError,
  type MarketDataProvider,
  type Quote,
} from "./types";

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * MarketDataService: caches provider answers, marks stale data, and never
 * fabricates a value. Consumers receive either data with provenance or a
 * typed error.
 */
export class MarketDataService {
  private readonly quotes = new Map<string, CacheEntry<Quote>>();
  private readonly rates = new Map<string, CacheEntry<ExchangeRate>>();

  constructor(
    private readonly provider: MarketDataProvider,
    private readonly ttlMs: number = DEFAULT_TTL_MS,
    private readonly now: () => number = () => Date.now(),
  ) {}

  get providerName(): string {
    return this.provider.name;
  }

  async getQuote(ticker: string): Promise<Quote | MarketDataError> {
    const key = ticker.toUpperCase();
    const cached = this.quotes.get(key);
    if (cached && cached.expiresAt > this.now()) return { ...cached.value, freshness: "cached" };
    let result: Quote | MarketDataError;
    try {
      result = await this.provider.getQuote(key);
    } catch {
      result = { code: "PROVIDER_ERROR", provider: this.provider.name };
    }
    if (isMarketDataError(result)) return result;
    if (this.now() - result.timestamp.getTime() > STALE_AFTER_MS)
      return { code: "STALE_DATA", provider: this.provider.name };
    this.quotes.set(key, { value: result, expiresAt: this.now() + this.ttlMs });
    return result;
  }

  async getExchangeRate(
    from: CurrencyCode,
    to: CurrencyCode,
  ): Promise<ExchangeRate | MarketDataError> {
    if (from === to) {
      return {
        from,
        to,
        rateMicros: 1_000_000,
        timestamp: new Date(this.now()),
        provider: "identity",
        freshness: "live",
      };
    }
    const key = `${from}:${to}`;
    const cached = this.rates.get(key);
    if (cached && cached.expiresAt > this.now()) return { ...cached.value, freshness: "cached" };
    let result: ExchangeRate | MarketDataError;
    try {
      result = await this.provider.getExchangeRate(from, to);
    } catch {
      result = { code: "PROVIDER_ERROR", provider: this.provider.name };
    }
    if (isMarketDataError(result)) return result;
    this.rates.set(key, { value: result, expiresAt: this.now() + this.ttlMs });
    return result;
  }

  /** Rates from every supported currency into `target`; missing rates are simply absent. */
  async getRateTable(target: CurrencyCode = REFERENCE_CURRENCY): Promise<ExchangeRateTable> {
    const results = await Promise.all(
      CURRENCY_CODES.filter((c) => c !== target).map((c) => this.getExchangeRate(c, target)),
    );
    return buildRateTable(results.filter((r): r is ExchangeRate => !isMarketDataError(r)));
  }
}

let instance: MarketDataService | null = null;

/** Provider selection is configuration-driven; only "mock" exists today. */
export function getMarketDataService(): MarketDataService {
  if (!instance) instance = new MarketDataService(new MockMarketDataProvider());
  return instance;
}
