import { describe, expect, it } from "vitest";
import { buildRateTable } from "./currency-conversion";
import {
  calculateGrossAssets,
  calculateLiabilities,
  calculateNetWorth,
  calculatePerformanceBps,
  calculateWealthSummary,
  type AssetLike,
  type LiabilityLike,
} from "./wealth-calculation";

const asset = (over: Partial<AssetLike> = {}): AssetLike => ({
  id: over.id ?? "a1",
  category: "CASH",
  currency: "EUR",
  currentValueCents: 0,
  isActive: true,
  ...over,
});
const liability = (over: Partial<LiabilityLike> = {}): LiabilityLike => ({
  id: over.id ?? "l1",
  currency: "EUR",
  remainingAmountCents: 0,
  ...over,
});

describe("WealthCalculationService", () => {
  it("returns zero for no assets and no liabilities", () => {
    const s = calculateWealthSummary([], []);
    expect(s.grossAssets.amountCents).toBe(0);
    expect(s.totalLiabilities.amountCents).toBe(0);
    expect(s.netWorth).toEqual({ amountCents: 0, currency: "EUR" });
  });

  it("handles 0 €, 1 € and the demo dataset", () => {
    expect(calculateGrossAssets([asset({ currentValueCents: 0 })]).total.amountCents).toBe(0);
    expect(calculateGrossAssets([asset({ currentValueCents: 100 })]).total.amountCents).toBe(100);
    const demo = calculateWealthSummary(
      [
        asset({ id: "res", category: "REAL_ESTATE", currentValueCents: (40_000_000_00 / 100) * 1 }),
        asset({ id: "etf", category: "ETF", currentValueCents: 10_000_000 }),
        asset({ id: "cash", category: "CASH", currentValueCents: 3_000_000 }),
        asset({ id: "scpi", category: "SCPI", currentValueCents: 8_000_000 }),
      ],
      [liability({ remainingAmountCents: 25_000_000 })],
    );
    expect(demo.grossAssets.amountCents).toBe(61_000_000);
    expect(demo.netWorth.amountCents).toBe(36_000_000);
    expect(demo.byFamily.REAL_ESTATE.amountCents).toBe(48_000_000);
    expect(demo.byFamily.FINANCIAL.amountCents).toBe(10_000_000);
    expect(demo.byFamily.LIQUIDITY.amountCents).toBe(3_000_000);
    expect(demo.byCategory.SCPI?.amountCents).toBe(8_000_000);
  });

  it("supports liabilities greater than assets (negative net worth)", () => {
    const s = calculateWealthSummary(
      [asset({ currentValueCents: 100 })],
      [liability({ remainingAmountCents: 500 })],
    );
    expect(s.netWorth.amountCents).toBe(-400);
  });

  it("ignores inactive assets", () => {
    const s = calculateGrossAssets([asset({ currentValueCents: 100, isActive: false })]);
    expect(s.total.amountCents).toBe(0);
  });

  it("handles assets only and debts only", () => {
    expect(
      calculateWealthSummary([asset({ currentValueCents: 100 })], []).netWorth.amountCents,
    ).toBe(100);
    expect(
      calculateWealthSummary([], [liability({ remainingAmountCents: 100 })]).netWorth.amountCents,
    ).toBe(-100);
  });

  it("handles very large values without precision loss", () => {
    const big = 9_000_000_000_000_00; // 9 000 000 000 000 € in cents (safe integer)
    const s = calculateGrossAssets([
      asset({ currentValueCents: big }),
      asset({ id: "a2", currentValueCents: 1 }),
    ]);
    expect(s.total.amountCents).toBe(big + 1);
  });

  it("rejects non-integer or negative-unsafe values", () => {
    expect(() => calculateGrossAssets([asset({ currentValueCents: 1.5 })])).toThrow();
  });

  it("converts foreign currencies with a rate table and excludes unconvertible ones", () => {
    const rates = buildRateTable([
      {
        from: "USD",
        to: "EUR",
        rateMicros: 920_000,
        timestamp: new Date(),
        provider: "test",
        freshness: "mock",
      },
    ]);
    const s = calculateWealthSummary(
      [
        asset({ id: "usd", currency: "USD", currentValueCents: 10_000 }),
        asset({ id: "gbp", currency: "GBP", currentValueCents: 10_000 }),
      ],
      [liability({ id: "chf", currency: "CHF", remainingAmountCents: 100 })],
      { rates },
    );
    expect(s.grossAssets.amountCents).toBe(9_200);
    expect(s.unconvertibleAssetIds).toEqual(["gbp"]);
    expect(s.unconvertibleLiabilityIds).toEqual(["chf"]);
    expect(s.totalLiabilities.amountCents).toBe(0);
  });

  it("computes net worth and performance", () => {
    expect(
      calculateNetWorth({ amountCents: 10, currency: "EUR" }, { amountCents: 4, currency: "EUR" })
        .amountCents,
    ).toBe(6);
    expect(calculatePerformanceBps(10_243_000, 8_500_000)).toBe(2051);
    expect(calculatePerformanceBps(100, null)).toBeNull();
    expect(calculatePerformanceBps(100, 0)).toBeNull();
  });

  it("calculateLiabilities sums remaining amounts", () => {
    expect(
      calculateLiabilities([
        liability({ remainingAmountCents: 1 }),
        liability({ id: "l2", remainingAmountCents: 2 }),
      ]).total.amountCents,
    ).toBe(3);
  });
});
