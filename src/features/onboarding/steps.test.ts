import { describe, expect, it } from "vitest";
import { parseAnswers } from "./schema";
import { getNextStep, getPreviousStep, getVisibleSteps } from "./steps";

describe("onboarding steps", () => {
  it("hides every conditional step when nothing is declared", () => {
    expect(getVisibleSteps(parseAnswers({}))).toEqual([
      "WELCOME",
      "SITUATION",
      "REVIEW",
      "GENERATE",
    ]);
  });

  it("shows only declared categories and investment sub-steps", () => {
    const answers = parseAnswers({
      situation: { hasPrimaryResidence: true, hasInvestments: true, hasLiabilities: true },
      investments: { ETF: true },
    });
    expect(getVisibleSteps(answers)).toEqual([
      "WELCOME",
      "SITUATION",
      "PRIMARY_RESIDENCE",
      "INVESTMENTS",
      "ETF",
      "LIABILITIES",
      "REVIEW",
      "GENERATE",
    ]);
    expect(getNextStep("PRIMARY_RESIDENCE", answers)).toBe("INVESTMENTS");
    expect(getPreviousStep("ETF", answers)).toBe("INVESTMENTS");
    expect(getNextStep("GENERATE", answers)).toBeNull();
  });

  it("recovers when the current step becomes hidden", () => {
    const answers = parseAnswers({ situation: { hasSavings: true } });
    expect(getNextStep("PRIMARY_RESIDENCE", answers)).toBe("SAVINGS");
    expect(getPreviousStep("SAVINGS", answers)).toBe("SITUATION");
  });

  it("parses partial answers with defaults and rejects invalid amounts", () => {
    const a = parseAnswers({ etf: [{ name: "CW8", valueCents: 100 }] });
    expect(a.etf[0]?.currency).toBe("EUR");
    expect(a.primaryResidence).toBeNull();
    expect(parseAnswers({ etf: [{ name: "x", valueCents: -1 }] }).etf).toEqual([]);
  });
});
