import { z } from "zod";
import { fieldErrorsFromZod } from "@/lib/validation/common";
import { formDataToObject, nestKeys } from "@/lib/validation/form-data";
import {
  incomeItemSchema,
  investmentsSchema,
  liabilityItemSchema,
  primaryResidenceSchema,
  realEstateItemSchema,
  simpleAssetItemSchema,
  situationSchema,
  type OnboardingAnswers,
} from "./schema";
import { LIST_STEPS, type OnboardingStepId } from "./steps";

/** "items.0.name" -> [{ name }] ; keeps row order, drops holes. */
function itemsFromForm(formData: FormData): unknown[] {
  const nested = nestKeys(formDataToObject(formData));
  const items = nested.items;
  if (!items || typeof items !== "object") return [];
  return Object.keys(items)
    .map(Number)
    .filter((n) => Number.isInteger(n))
    .sort((a, b) => a - b)
    .map((n) => (items as Record<string, unknown>)[String(n)]);
}

function checkboxObject(formData: FormData, keys: readonly string[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of keys) out[key] = formData.get(key) === "on";
  return out;
}

const SITUATION_KEYS = Object.keys(situationSchema.shape);
const INVESTMENT_KEYS = Object.keys(investmentsSchema.shape);

export type ParsedStep =
  | { ok: true; patch: Partial<OnboardingAnswers> }
  | { ok: false; fieldErrors: Record<string, string[]> };

/** True when the visitor pressed "Passer" rather than "Continuer". */
function isSkip(formData: FormData): boolean {
  return formData.get("skip") === "1";
}

/**
 * Empty value of a step, stored when it is skipped: a skipped step declares
 * "nothing here", which has to erase anything a previous visit left behind.
 */
function emptyPatch(step: OnboardingStepId): Partial<OnboardingAnswers> {
  const listConfig = LIST_STEPS[step];
  if (listConfig) return { [listConfig.key]: [] } as Partial<OnboardingAnswers>;
  if (step === "REAL_ESTATE") return { realEstate: [] };
  if (step === "LIABILITIES") return { liabilities: [] };
  if (step === "INCOME") return { income: [] };
  if (step === "PRIMARY_RESIDENCE") return { primaryResidence: null };
  return {};
}

/**
 * Validates the payload of one step and returns the patch to merge into the
 * answers. Exported for tests: the branch that decides whether the visitor can
 * move on is worth checking without a browser.
 */
export function parseStep(step: OnboardingStepId, formData: FormData): ParsedStep {
  // "Passer" means the step is empty on purpose, so nothing is validated.
  if (isSkip(formData)) return { ok: true, patch: emptyPatch(step) };
  const listConfig = LIST_STEPS[step];
  let parsed: z.ZodSafeParseResult<unknown>;
  let key: keyof OnboardingAnswers;
  if (step === "SITUATION") {
    parsed = situationSchema.safeParse(checkboxObject(formData, SITUATION_KEYS));
    key = "situation";
  } else if (step === "INVESTMENTS") {
    parsed = investmentsSchema.safeParse(checkboxObject(formData, INVESTMENT_KEYS));
    key = "investments";
  } else if (step === "PRIMARY_RESIDENCE") {
    parsed = primaryResidenceSchema.safeParse(formDataToObject(formData));
    key = "primaryResidence";
  } else if (step === "REAL_ESTATE") {
    parsed = z.array(realEstateItemSchema).safeParse(itemsFromForm(formData));
    key = "realEstate";
  } else if (step === "LIABILITIES") {
    parsed = z.array(liabilityItemSchema).safeParse(itemsFromForm(formData));
    key = "liabilities";
  } else if (step === "INCOME") {
    parsed = z.array(incomeItemSchema).safeParse(itemsFromForm(formData));
    key = "income";
  } else if (listConfig) {
    parsed = z.array(simpleAssetItemSchema).safeParse(itemsFromForm(formData));
    key = listConfig.key;
  } else {
    return { ok: true, patch: {} };
  }
  if (!parsed.success) {
    // Zod reports an array issue at "0.name"; the inputs are named
    // "items.0.name". Without the prefix the messages never reached a field and
    // the step looked frozen: the visitor pressed Continuer and nothing moved.
    const raw = fieldErrorsFromZod(parsed.error);
    const prefixed = Array.isArray(parsed.data ?? null) || isListPayload(step);
    const fieldErrors = prefixed
      ? Object.fromEntries(Object.entries(raw).map(([k, v]) => [`items.${k}`, v]))
      : raw;
    return { ok: false, fieldErrors };
  }
  return { ok: true, patch: { [key]: parsed.data } as Partial<OnboardingAnswers> };
}

/** Steps whose form is a repeatable list of rows named "items.{i}.{field}". */
function isListPayload(step: OnboardingStepId): boolean {
  return (
    Boolean(LIST_STEPS[step]) ||
    step === "REAL_ESTATE" ||
    step === "LIABILITIES" ||
    step === "INCOME"
  );
}
