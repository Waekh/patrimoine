import { describe, expect, it } from "vitest";
import { calculateWealthScore, getWorldLevel } from "./wealth-score";
import type { AssetFamily } from "@/config/categories";
import type { Money } from "@/lib/money";

const dist = (over: Partial<Record<AssetFamily, number>> = {}): Record<AssetFamily, Money> => ({
  REAL_ESTATE: { amountCents: over.REAL_ESTATE ?? 0, currency: "EUR" },
  LIQUIDITY: { amountCents: over.LIQUIDITY ?? 0, currency: "EUR" },
  FINANCIAL: { amountCents: over.FINANCIAL ?? 0, currency: "EUR" },
  ALTERNATIVE: { amountCents: over.ALTERNATIVE ?? 0, currency: "EUR" },
});

describe("WealthScoreService", () => {
  it("maps net worth to world levels from the config", () => {
    expect(getWorldLevel(0)).toBe("HAMLET");
    expect(getWorldLevel(-1_000)).toBe("HAMLET");
    expect(getWorldLevel(4_999_999)).toBe("HAMLET");
    expect(getWorldLevel(5_000_000)).toBe("VILLAGE");
    expect(getWorldLevel(15_000_000)).toBe("TOWN");
    expect(getWorldLevel(36_000_000)).toBe("CITY");
    expect(getWorldLevel(50_000_000)).toBe("LARGE_CITY");
    expect(getWorldLevel(100_000_000)).toBe("METROPOLIS");
    expect(getWorldLevel(300_000_000)).toBe("MEGAPOLIS");
    expect(getWorldLevel(Number.MAX_SAFE_INTEGER)).toBe("MEGAPOLIS");
  });

  it("scores 0 for an empty patrimony and grows monotonically", () => {
    const empty = calculateWealthScore({
      netWorthCents: 0,
      assetDistribution: dist(),
      liabilitiesCents: 0,
    });
    expect(empty.wealthScore).toBe(0);
    expect(empty.cityLevel).toBe(1);
    const small = calculateWealthScore({
      netWorthCents: 100,
      assetDistribution: dist({ LIQUIDITY: 100 }),
      liabilitiesCents: 0,
    });
    const large = calculateWealthScore({
      netWorthCents: 36_000_000,
      assetDistribution: dist({ REAL_ESTATE: 1, FINANCIAL: 1 }),
      liabilitiesCents: 25_000_000,
    });
    expect(small.wealthScore).toBeGreaterThan(0);
    expect(large.wealthScore).toBeGreaterThan(small.wealthScore);
    expect(large.worldLevel).toBe("CITY");
    expect(large.nextLevelAtCents).toBe(50_000_000);
    expect(large.levelProgress).toBeCloseTo(0.3, 5);
  });

  it("caps at the maximum and reports the top level", () => {
    const top = calculateWealthScore({
      netWorthCents: 10_000_000_000,
      assetDistribution: dist({ REAL_ESTATE: 1, FINANCIAL: 1, LIQUIDITY: 1, ALTERNATIVE: 1 }),
      liabilitiesCents: 0,
    });
    expect(top.wealthScore).toBe(1000);
    expect(top.nextLevelAtCents).toBeNull();
    expect(top.levelProgress).toBe(1);
  });

  it("never goes negative with negative net worth", () => {
    const r = calculateWealthScore({
      netWorthCents: -50_000,
      assetDistribution: dist(),
      liabilitiesCents: 50_000,
    });
    expect(r.wealthScore).toBe(0);
    expect(r.worldLevel).toBe("HAMLET");
  });
});
