import type { AssetCategory } from "@/config/categories";
import type { OnboardingAnswers } from "./schema";

export const ONBOARDING_STEP_IDS = [
  "WELCOME",
  "SITUATION",
  "PRIMARY_RESIDENCE",
  "REAL_ESTATE",
  "BANK_ACCOUNTS",
  "SAVINGS",
  "INVESTMENTS",
  "ETF",
  "STOCKS",
  "PEA",
  "LIFE_INSURANCE",
  "PEE",
  "SCPI",
  "CRYPTO",
  "OTHER_ASSETS",
  "LIABILITIES",
  "INCOME",
  "REVIEW",
  "GENERATE",
] as const;
export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number];

export function isOnboardingStepId(value: unknown): value is OnboardingStepId {
  return typeof value === "string" && (ONBOARDING_STEP_IDS as readonly string[]).includes(value);
}

/** Simple-list steps share one form; this maps them to their answers key and asset category. */
export const LIST_STEPS: Partial<
  Record<
    OnboardingStepId,
    { key: keyof OnboardingAnswers; category: AssetCategory; withTicker: boolean }
  >
> = {
  BANK_ACCOUNTS: { key: "bankAccounts", category: "CASH", withTicker: false },
  SAVINGS: { key: "savings", category: "SAVINGS", withTicker: false },
  ETF: { key: "etf", category: "ETF", withTicker: true },
  STOCKS: { key: "stocks", category: "STOCK", withTicker: true },
  PEA: { key: "pea", category: "PEA", withTicker: false },
  LIFE_INSURANCE: { key: "lifeInsurance", category: "LIFE_INSURANCE", withTicker: false },
  PEE: { key: "pee", category: "PEE", withTicker: false },
  SCPI: { key: "scpi", category: "SCPI", withTicker: false },
  CRYPTO: { key: "crypto", category: "CRYPTO", withTicker: true },
  OTHER_ASSETS: { key: "otherAssets", category: "OTHER", withTicker: false },
};

/** The questionnaire is adaptive: a step is shown only when its category was declared. */
export function isStepVisible(step: OnboardingStepId, answers: OnboardingAnswers): boolean {
  const s = answers.situation;
  const inv = answers.investments;
  switch (step) {
    case "PRIMARY_RESIDENCE":
      return s.hasPrimaryResidence;
    case "REAL_ESTATE":
      return s.hasRealEstate;
    case "BANK_ACCOUNTS":
      return s.hasBankAccounts;
    case "SAVINGS":
      return s.hasSavings;
    case "INVESTMENTS":
      return s.hasInvestments;
    case "ETF":
      return s.hasInvestments && inv.ETF;
    case "STOCKS":
      return s.hasInvestments && inv.STOCK;
    case "PEA":
      return s.hasInvestments && inv.PEA;
    case "LIFE_INSURANCE":
      return s.hasInvestments && inv.LIFE_INSURANCE;
    case "PEE":
      return s.hasInvestments && inv.PEE;
    case "SCPI":
      return s.hasScpi;
    case "CRYPTO":
      return s.hasCrypto;
    case "OTHER_ASSETS":
      return s.hasOtherAssets;
    case "LIABILITIES":
      return s.hasLiabilities;
    case "INCOME":
      return s.hasIncome;
    default:
      return true;
  }
}

export function getVisibleSteps(answers: OnboardingAnswers): OnboardingStepId[] {
  return ONBOARDING_STEP_IDS.filter((step) => isStepVisible(step, answers));
}

export function getNextStep(
  current: OnboardingStepId,
  answers: OnboardingAnswers,
): OnboardingStepId | null {
  const visible = getVisibleSteps(answers);
  const index = visible.indexOf(current);
  const fallback = ONBOARDING_STEP_IDS.indexOf(current);
  // If the current step became hidden, continue from the next visible step after it in global order.
  const nextGlobal =
    index >= 0
      ? visible[index + 1]
      : visible.find((s) => ONBOARDING_STEP_IDS.indexOf(s) > fallback);
  return nextGlobal ?? null;
}

export function getPreviousStep(
  current: OnboardingStepId,
  answers: OnboardingAnswers,
): OnboardingStepId | null {
  const visible = getVisibleSteps(answers);
  const index = visible.indexOf(current);
  if (index > 0) return visible[index - 1] ?? null;
  const globalIndex = ONBOARDING_STEP_IDS.indexOf(current);
  return [...visible].reverse().find((s) => ONBOARDING_STEP_IDS.indexOf(s) < globalIndex) ?? null;
}

export function stepIndexOf(step: OnboardingStepId): number {
  return ONBOARDING_STEP_IDS.indexOf(step);
}

export function stepFromIndex(index: number): OnboardingStepId {
  return (
    ONBOARDING_STEP_IDS[Math.max(0, Math.min(ONBOARDING_STEP_IDS.length - 1, index))] ?? "WELCOME"
  );
}
