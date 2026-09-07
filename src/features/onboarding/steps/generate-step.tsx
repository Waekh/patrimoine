"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/states";
import { t } from "@/lib/i18n";
import type { OnboardingAnswers } from "../schema";
import { generateWorldAction, type StepFormState } from "../actions";
import { StepHeading } from "../step-heading";

export function GenerateStep({ answers }: { answers: OnboardingAnswers }) {
  const [state, action, pending] = useActionState(
    async (): Promise<StepFormState> => generateWorldAction(),
    {} as StepFormState,
  );
  const declared = Object.values(answers.situation).some(Boolean);
  return (
    <form action={action} className="flex flex-col gap-8">
      <StepHeading title={t("onboarding.generateTitle")} text={t("onboarding.generateText")} />
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      {!declared ? <Notice tone="info">{t("world.emptyCta")}</Notice> : null}
      <Button type="submit" loading={pending} className="self-start">
        {pending ? t("onboarding.generating") : t("onboarding.generateButton")}
      </Button>
    </form>
  );
}
