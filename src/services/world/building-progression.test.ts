import { describe, expect, it } from "vitest";
import {
  describeValueChange,
  getBuildingLevel,
  getNextLevelThreshold,
} from "./building-progression";

describe("getBuildingLevel", () => {
  it("uses the thresholds from the config", () => {
    expect(getBuildingLevel("HOUSE", 0)).toBe(1);
    expect(getBuildingLevel("HOUSE", 14_999_999)).toBe(1);
    expect(getBuildingLevel("HOUSE", 15_000_000)).toBe(2);
    expect(getBuildingLevel("HOUSE", 40_000_000)).toBe(3);
    expect(getBuildingLevel("HOUSE", 90_000_000)).toBe(5);
    expect(getBuildingLevel("HOUSE", Number.MAX_SAFE_INTEGER)).toBe(5);
    expect(getBuildingLevel("BANK", 3_000_000)).toBe(3);
    expect(getBuildingLevel("PARK", 1_000_000_000)).toBe(1);
  });
  it("exposes the next threshold", () => {
    expect(getNextLevelThreshold("HOUSE", 1)).toBe(15_000_000);
    expect(getNextLevelThreshold("HOUSE", 5)).toBeNull();
    expect(getNextLevelThreshold("PARK", 1)).toBeNull();
  });
});

describe("describeValueChange", () => {
  it("computes difference, percentage and xp", () => {
    const c = describeValueChange(8_500_000, 10_243_000);
    expect(c.differenceCents).toBe(1_743_000);
    expect(c.percentageBps).toBe(2051);
    expect(c.xp).toBe(21);
    expect(describeValueChange(0, 100).percentageBps).toBeNull();
    expect(describeValueChange(100, 50).xp).toBe(0);
  });
});
