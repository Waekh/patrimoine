import { describe, expect, it } from "vitest";
import { MarketDataService } from "./market-data-service";
import { MockMarketDataProvider } from "./mock-provider";
import { isMarketDataError, type MarketDataProvider } from "./types";
import { valueAsset } from "@/services/valuation/valuation-service";

describe("MarketDataService", () => {
  it("returns mock quotes with provenance and caches them", async () => {
    let now = 1_000_000;
    const service = new MarketDataService(
      new MockMarketDataProvider(() => new Date(now)),
      1000,
      () => now,
    );
    const first = await service.getQuote("cw8");
    expect(isMarketDataError(first)).toBe(false);
    if (isMarketDataError(first)) return;
    expect(first.freshness).toBe("mock");
    expect(first.provider).toBe("mock");
    const second = await service.getQuote("CW8");
    if (isMarketDataError(second)) throw new Error("unexpected");
    expect(second.freshness).toBe("cached");
    now += 5000;
    const third = await service.getQuote("CW8");
    if (isMarketDataError(third)) throw new Error("unexpected");
    expect(third.freshness).toBe("mock");
  });

  it("reports unknown tickers, provider failures and stale data as errors", async () => {
    const service = new MarketDataService(new MockMarketDataProvider());
    expect(await service.getQuote("NOPE")).toMatchObject({ code: "UNKNOWN_TICKER" });

    const failing: MarketDataProvider = {
      name: "failing",
      getQuote: async () => {
        throw new Error("boom");
      },
      getHistoricalPrices: async () => ({ code: "NO_DATA", provider: "failing" }),
      getExchangeRate: async () => ({ code: "RATE_LIMITED", provider: "failing" }),
    };
    const failingService = new MarketDataService(failing);
    expect(await failingService.getQuote("X")).toMatchObject({ code: "PROVIDER_ERROR" });
    expect(await failingService.getExchangeRate("USD", "EUR")).toMatchObject({
      code: "RATE_LIMITED",
    });

    const stale = new MarketDataService(new MockMarketDataProvider(() => new Date(0)));
    expect(await stale.getQuote("CW8")).toMatchObject({ code: "STALE_DATA" });
  });

  it("builds a rate table and identity rates", async () => {
    const service = new MarketDataService(new MockMarketDataProvider());
    const table = await service.getRateTable("EUR");
    expect(table.get("USD:EUR")?.rateMicros).toBe(920_000);
    expect(table.has("EUR:EUR")).toBe(false);
    const identity = await service.getExchangeRate("EUR", "EUR");
    expect(identity).toMatchObject({ rateMicros: 1_000_000 });
  });
});

describe("valueAsset", () => {
  const market = new MarketDataService(new MockMarketDataProvider());
  it("uses the manual value for MANUAL", async () => {
    const r = await valueAsset(
      {
        valuationType: "MANUAL",
        currency: "EUR",
        manualValueCents: 123,
        quantity: null,
        ticker: null,
      },
      market,
    );
    expect(r).toMatchObject({ status: "MANUAL", currentValueCents: 123 });
  });
  it("multiplies quantity by the quote for MARKET", async () => {
    const r = await valueAsset(
      {
        valuationType: "MARKET",
        currency: "EUR",
        manualValueCents: null,
        quantity: "10",
        ticker: "CW8",
      },
      market,
    );
    expect(r).toMatchObject({ status: "MARKET", currentValueCents: 524_120 });
  });
  it("never invents a value when the quote is unavailable or in another currency", async () => {
    expect(
      await valueAsset(
        {
          valuationType: "MARKET",
          currency: "EUR",
          manualValueCents: 5,
          quantity: "1",
          ticker: "NOPE",
        },
        market,
      ),
    ).toMatchObject({ status: "UNAVAILABLE", reason: "UNKNOWN_TICKER", fallbackValueCents: 5 });
    expect(
      await valueAsset(
        {
          valuationType: "MARKET",
          currency: "EUR",
          manualValueCents: null,
          quantity: "1",
          ticker: "SPY",
        },
        market,
      ),
    ).toMatchObject({ status: "UNAVAILABLE", reason: "CURRENCY_MISMATCH" });
    expect(
      await valueAsset(
        {
          valuationType: "MARKET",
          currency: "EUR",
          manualValueCents: null,
          quantity: null,
          ticker: "CW8",
        },
        market,
      ),
    ).toMatchObject({ status: "UNAVAILABLE", reason: "MISSING_INPUT" });
  });
});
