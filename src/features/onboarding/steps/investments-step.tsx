import { messages, t } from "@/lib/i18n";
import type { OnboardingAnswers } from "../schema";
import { investmentsSchema } from "../schema";
import { StepHeading } from "../step-heading";
import { CheckboxList } from "./checkbox-list";

export function InvestmentsStep({ answers }: { answers: OnboardingAnswers }) {
  const keys = Object.keys(investmentsSchema.shape) as Array<
    keyof OnboardingAnswers["investments"]
  >;
  return (
    <div className="flex flex-col gap-6">
      <StepHeading
        title={t("onboarding.investments.title")}
        text={t("onboarding.investments.text")}
      />
      <CheckboxList
        items={keys.map((k) => ({
          name: k,
          label: messages.onboarding.investments[k],
          checked: answers.investments[k],
        }))}
      />
    </div>
  );
}
