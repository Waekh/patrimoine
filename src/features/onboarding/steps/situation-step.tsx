import { messages, t } from "@/lib/i18n";
import type { OnboardingAnswers } from "../schema";
import { situationSchema } from "../schema";
import { StepHeading } from "../step-heading";
import { CheckboxList } from "./checkbox-list";

export function SituationStep({ answers }: { answers: OnboardingAnswers }) {
  const keys = Object.keys(situationSchema.shape) as Array<keyof OnboardingAnswers["situation"]>;
  return (
    <div className="flex flex-col gap-6">
      <StepHeading title={t("onboarding.situationTitle")} text={t("onboarding.situationText")} />
      <CheckboxList
        items={keys.map((k) => ({
          name: k,
          label: messages.onboarding.situation[k],
          checked: answers.situation[k],
        }))}
      />
    </div>
  );
}
