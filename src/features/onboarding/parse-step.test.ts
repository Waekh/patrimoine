import { describe, expect, it } from "vitest";
import { parseStep } from "./parse-step";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

describe("onboarding step validation", () => {
  it("reports list errors under the name the inputs actually use", () => {
    // The row is empty, so it cannot pass. The messages have to land on
    // "items.0.name", which is how the field is named: keyed as "0.name" they
    // reached no field at all and the step looked frozen.
    const result = parseStep(
      "REAL_ESTATE",
      form({ "items.0.name": "", "items.0.valueCents": "0", "items.0.propertyType": "RENTAL" }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.fieldErrors).length).toBeGreaterThan(0);
    for (const key of Object.keys(result.fieldErrors)) expect(key).toMatch(/^items\.\d+\./);
  });

  it("lets a filled row through", () => {
    const result = parseStep(
      "REAL_ESTATE",
      form({
        "items.0.name": "Studio",
        "items.0.valueCents": "12000000",
        "items.0.propertyType": "RENTAL",
        "items.0.currency": "EUR",
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("skips an empty step instead of validating it", () => {
    // "Passer" used to submit the form like "Continuer": it hit the same
    // validation, failed, and nothing moved.
    const result = parseStep("REAL_ESTATE", form({ "items.0.name": "", skip: "1" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.patch).toEqual({ realEstate: [] });
  });

  it("erases what a skipped step held before", () => {
    for (const [step, patch] of [
      ["LIABILITIES", { liabilities: [] }],
      ["INCOME", { income: [] }],
      ["PRIMARY_RESIDENCE", { primaryResidence: null }],
    ] as const) {
      const result = parseStep(step, form({ skip: "1" }));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.patch).toEqual(patch);
    }
  });

  it("still validates the situation step, which cannot be skipped", () => {
    const result = parseStep("SITUATION", form({ hasBankAccounts: "on" }));
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.patch).toEqual({
        situation: expect.objectContaining({ hasBankAccounts: true }),
      });
  });
});
