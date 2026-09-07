import { describe, expect, it } from "vitest";
import { formatCurrency, formatPercentage } from "./index";

const nbsp = /[  ]/g;

describe("formatCurrency", () => {
  it("formats euros with French conventions", () => {
    expect(formatCurrency({ amountCents: 10_243_000, currency: "EUR" }).replace(nbsp, " ")).toBe(
      "102 430 €",
    );
  });
  it("handles 0, 1 and negative values", () => {
    expect(formatCurrency({ amountCents: 0, currency: "EUR" }).replace(nbsp, " ")).toBe("0 €");
    expect(formatCurrency({ amountCents: 100, currency: "EUR" }).replace(nbsp, " ")).toBe("1 €");
    expect(formatCurrency({ amountCents: -100, currency: "EUR" }).replace(nbsp, " ")).toBe("-1 €");
  });
  it("supports decimals, signs and other currencies", () => {
    expect(
      formatCurrency({ amountCents: 123_456, currency: "EUR" }, { withDecimals: true }).replace(
        nbsp,
        " ",
      ),
    ).toBe("1 234,56 €");
    expect(
      formatCurrency({ amountCents: 100, currency: "EUR" }, { signed: true }).replace(nbsp, " "),
    ).toBe("+1 €");
    expect(formatCurrency({ amountCents: 1500, currency: "JPY" }).replace(nbsp, " ")).toMatch(
      /1 500/,
    );
    expect(formatCurrency({ amountCents: 100, currency: "USD" }).replace(nbsp, " ")).toMatch(
      /\$US|US\$|\$/,
    );
  });
  it("formats very large values", () => {
    expect(
      formatCurrency({ amountCents: 900_000_000_000_000, currency: "EUR" }).replace(nbsp, " "),
    ).toBe("9 000 000 000 000 €");
  });
});

describe("formatPercentage", () => {
  it("formats bps with sign and comma", () => {
    expect(formatPercentage(842).replace(nbsp, " ")).toBe("+8,42 %");
    expect(formatPercentage(-125).replace(nbsp, " ")).toBe("-1,25 %");
    expect(formatPercentage(0).replace(nbsp, " ")).toBe("0,00 %");
    expect(formatPercentage(5000, { signed: false, fractionDigits: 0 }).replace(nbsp, " ")).toBe(
      "50 %",
    );
  });
});
