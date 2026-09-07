import Link from "next/link";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { StepHeading } from "../step-heading";

export function WelcomeStep() {
  return (
    <div className="flex flex-col gap-8">
      <StepHeading title={t("onboarding.welcomeTitle")} text={t("onboarding.welcomeText")} />
      <Link href="/onboarding?step=SITUATION" className="self-start">
        <Button>{t("onboarding.welcomeStart")}</Button>
      </Link>
    </div>
  );
}
