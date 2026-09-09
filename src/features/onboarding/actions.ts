"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { withUserDb } from "@/db/user-db";
import { findOnboardingProgress, saveOnboardingProgress } from "@/db/queries/onboarding";
import { requireUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { logger } from "@/lib/logger";
import { completeOnboarding } from "@/services/onboarding/onboarding-completion";
import { parseAnswers, type OnboardingAnswers } from "./schema";
import { parseStep } from "./parse-step";
import { getNextStep, isOnboardingStepId, stepIndexOf, type OnboardingStepId } from "./steps";

export interface StepFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  savedAt?: string;
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
