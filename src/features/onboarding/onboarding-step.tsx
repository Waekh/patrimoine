import Link from "next/link";
import { Progress } from "@/components/ui/states";
import { t } from "@/lib/i18n";
import type { OnboardingAnswers } from "./schema";
import { getPreviousStep, type OnboardingStepId } from "./steps";
import { StepForm } from "./step-form";
import { GenerateStep } from "./steps/generate-step";
import { InvestmentsStep } from "./steps/investments-step";
import { ListStep } from "./steps/list-step";
import { PrimaryResidenceStep } from "./steps/primary-residence-step";
import { RealEstateStep } from "./steps/real-estate-step";
import { LiabilitiesStep } from "./steps/liabilities-step";
import { IncomeStep } from "./steps/income-step";
import { ReviewStep } from "./steps/review-step";
import { SituationStep } from "./steps/situation-step";
import { WelcomeStep } from "./steps/welcome-step";
import { LIST_STEPS } from "./steps";
import { messages } from "@/lib/i18n";

export function OnboardingStep({
  step,
  answers,
  visibleSteps,
}: {
  step: OnboardingStepId;
  answers: OnboardingAnswers;
  visibleSteps: OnboardingStepId[];
}) {
  const index = visibleSteps.indexOf(step);
  const previous = getPreviousStep(step, answers);
  const header = (
    <div className="mb-8 flex flex-col gap-3">
      <Progress
        value={index + 1}
        max={visibleSteps.length}
        label={t("onboarding.progress", { current: index + 1, total: visibleSteps.length })}
      />
      <div className="text-fg-muted flex items-center justify-between text-xs">
        <span>{messages.onboarding.steps[step]}</span>
        {previous ? (
          <Link
            href={`/onboarding?step=${previous}`}
            className="underline-offset-2 hover:underline"
          >
            {t("common.back")}
          </Link>
        ) : null}
      </div>
    </div>
  );

  if (step === "WELCOME")
    return (
      <>
        {header}
        <WelcomeStep />
      </>
    );
  if (step === "GENERATE")
    return (
      <>
        {header}
        <GenerateStep answers={answers} />
      </>
    );
  if (step === "REVIEW")
    return (
      <>
        {header}
        <ReviewStep answers={answers} />
      </>
    );

  const listConfig = LIST_STEPS[step];
  return (
    <>
      {header}
      <StepForm step={step} allowSkip={step !== "SITUATION"}>
        {step === "SITUATION" ? <SituationStep answers={answers} /> : null}
        {step === "INVESTMENTS" ? <InvestmentsStep answers={answers} /> : null}
        {step === "PRIMARY_RESIDENCE" ? <PrimaryResidenceStep answers={answers} /> : null}
        {step === "REAL_ESTATE" ? <RealEstateStep answers={answers} /> : null}
        {step === "LIABILITIES" ? <LiabilitiesStep answers={answers} /> : null}
        {step === "INCOME" ? <IncomeStep answers={answers} /> : null}
        {listConfig ? <ListStep step={step} config={listConfig} answers={answers} /> : null}
      </StepForm>
    </>
  );
}
