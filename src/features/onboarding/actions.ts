"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withUserDb } from "@/db/user-db";
import { findOnboardingProgress, saveOnboardingProgress } from "@/db/queries/onboarding";
import { requireUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { logger } from "@/lib/logger";
import { fieldErrorsFromZod } from "@/lib/validation/common";
import { formDataToObject, nestKeys } from "@/lib/validation/form-data";
import { completeOnboarding } from "@/services/onboarding/onboarding-completion";
import {
  incomeItemSchema,
  investmentsSchema,
  liabilityItemSchema,
  parseAnswers,
  primaryResidenceSchema,
  realEstateItemSchema,
  simpleAssetItemSchema,
  situationSchema,
  type OnboardingAnswers,
} from "./schema";
import {
  getNextStep,
  isOnboardingStepId,
  LIST_STEPS,
  stepIndexOf,
  type OnboardingStepId,
} from "./steps";

export interface StepFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  savedAt?: string;
}

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

/** Validates the payload of one step and returns the patch to merge into the answers. */
function parseStep(
  step: OnboardingStepId,
  formData: FormData,
):
  | { ok: true; patch: Partial<OnboardingAnswers> }
  | { ok: false; fieldErrors: Record<string, string[]> } {
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
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  return { ok: true, patch: { [key]: parsed.data } as Partial<OnboardingAnswers> };
}

async function persist(
  userId: string,
  step: OnboardingStepId,
  patch: Partial<OnboardingAnswers>,
  advance: boolean,
): Promise<OnboardingAnswers> {
  return withUserDb(userId, async (tx) => {
    const progress = await findOnboardingProgress(tx, userId);
    const merged = parseAnswers({ ...parseAnswers(progress?.answers), ...patch });
    const next = advance ? (getNextStep(step, merged) ?? step) : step;
    await saveOnboardingProgress(tx, userId, stepIndexOf(next), merged);
    return merged;
  });
}

/** Autosave: validates leniently (a draft may be incomplete) and stores what parses. */
export async function saveDraftAction(step: string, formData: FormData): Promise<StepFormState> {
  const user = await requireUser();
  if (!isOnboardingStepId(step)) return { error: t("common.genericError") };
  try {
    const result = parseStep(step, formData);
    if (!result.ok) return { fieldErrors: result.fieldErrors };
    await persist(user.id, step, result.patch, false);
    return { savedAt: new Date().toISOString() };
  } catch (error) {
    logger.error("onboarding.draft.failed", error, { userId: user.id, step });
    return { error: t("common.genericError") };
  }
}

/** Save and move to the next visible step. */
export async function continueStepAction(
  step: string,
  _prev: StepFormState,
  formData: FormData,
): Promise<StepFormState> {
  const user = await requireUser();
  if (!isOnboardingStepId(step)) return { error: t("common.genericError") };
  let next: OnboardingStepId | null = null;
  try {
    const result = parseStep(step, formData);
    if (!result.ok) return { fieldErrors: result.fieldErrors };
    const merged = await persist(user.id, step, result.patch, true);
    next = getNextStep(step, merged);
  } catch (error) {
    logger.error("onboarding.continue.failed", error, { userId: user.id, step });
    return { error: t("common.genericError") };
  }
  redirect(next ? `/onboarding?step=${next}` : "/onboarding?step=GENERATE");
}

export async function generateWorldAction(): Promise<StepFormState> {
  const user = await requireUser();
  const progress = await withUserDb(user.id, (tx) => findOnboardingProgress(tx, user.id));
  const result = await completeOnboarding(user.id, parseAnswers(progress?.answers));
  if (!result.ok) return { error: result.error.message };
  for (const path of ["/world", "/patrimoine", "/assets", "/liabilities", "/history"])
    revalidatePath(path);
  redirect("/world?welcome=1");
}
