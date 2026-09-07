import { describe, expect, it } from "vitest";
import {
  add,
  centsToMajorUnitsString,
  multiplyQuantityByUnitPrice,
  parseMajorUnitsToCents,
  ratioBps,
  subtract,
  sum,
} from "./money";

describe("money", () => {
  it("adds and subtracts integer cents", () => {
    expect(
      add({ amountCents: 100, currency: "EUR" }, { amountCents: 1, currency: "EUR" }).amountCents,
    ).toBe(101);
    expect(
      subtract({ amountCents: 0, currency: "EUR" }, { amountCents: 1, currency: "EUR" })
        .amountCents,
    ).toBe(-1);
  });

  it("refuses mixed currencies and non-integers", () => {
    expect(() =>
      add({ amountCents: 1, currency: "EUR" }, { amountCents: 1, currency: "USD" }),
    ).toThrow();
    expect(() =>
      add({ amountCents: 1.5, currency: "EUR" }, { amountCents: 1, currency: "EUR" }),
    ).toThrow();
  });

  it("sums empty lists to zero", () => {
    expect(sum([], "EUR")).toEqual({ amountCents: 0, currency: "EUR" });
  });

  it("parses major units without floating point drift", () => {
    expect(parseMajorUnitsToCents("0.1", "EUR")).toBe(10);
    expect(parseMajorUnitsToCents("0,2", "EUR")).toBe(20);
    expect(parseMajorUnitsToCents("1 234,56", "EUR")).toBe(123_456);
    expect(parseMajorUnitsToCents("400000", "EUR")).toBe(40_000_000);
    expect(parseMajorUnitsToCents("-1", "EUR")).toBe(-100);
    expect(parseMajorUnitsToCents("1.234", "EUR")).toBeNull();
    expect(parseMajorUnitsToCents("abc", "EUR")).toBeNull();
    expect(parseMajorUnitsToCents("1500", "JPY")).toBe(1500);
    expect(parseMajorUnitsToCents("15.5", "JPY")).toBeNull();
  });

  it("formats cents back to a decimal string", () => {
    expect(centsToMajorUnitsString(123_456, "EUR")).toBe("1234.56");
    expect(centsToMajorUnitsString(-5, "EUR")).toBe("-0.05");
    expect(centsToMajorUnitsString(1500, "JPY")).toBe("1500");
  });

  it("multiplies quantity by unit price exactly", () => {
    expect(multiplyQuantityByUnitPrice("3", 1000)).toBe(3000);
    expect(multiplyQuantityByUnitPrice("0.1", 3)).toBe(0); // 0.3 cents rounds to 0
    expect(multiplyQuantityByUnitPrice("1.5", 3)).toBe(5); // 4.5 rounds half up
    expect(multiplyQuantityByUnitPrice("12.345678912", 100)).toBeNull(); // too many decimals
    expect(multiplyQuantityByUnitPrice("2.5", 40_000_000)).toBe(100_000_000);
  });

  it("computes ratios in bps", () => {
    expect(ratioBps(50, 100)).toBe(5000);
    expect(ratioBps(1, 0)).toBeNull();
  });
});
