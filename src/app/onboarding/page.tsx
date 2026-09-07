import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { withUserDb } from "@/db/user-db";
import { findOnboardingProgress } from "@/db/queries/onboarding";
import { requireUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { parseAnswers } from "@/features/onboarding/schema";
import {
  getVisibleSteps,
  isOnboardingStepId,
  stepFromIndex,
  type OnboardingStepId,
} from "@/features/onboarding/steps";
import { OnboardingStep } from "@/features/onboarding/onboarding-step";

export const metadata: Metadata = { title: `${t("onboarding.title")} — ${t("app.name")}` };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const progress = await withUserDb(user.id, (tx) => findOnboardingProgress(tx, user.id));
  const answers = parseAnswers(progress?.answers);
  const visible = getVisibleSteps(answers);
  const requested: OnboardingStepId | null = isOnboardingStepId(params.step) ? params.step : null;
  const saved = stepFromIndex(progress?.currentStep ?? 0);
  const current = requested ?? saved;
  if (!visible.includes(current)) {
    // The step was hidden by a change in the situation: resume at the closest visible step.
    const fallback = visible.find((s) => visible.indexOf(s) >= 0 && s !== current) ?? "WELCOME";
    redirect(`/onboarding?step=${fallback}`);
  }
  return <OnboardingStep step={current} answers={answers} visibleSteps={visible} />;
}
