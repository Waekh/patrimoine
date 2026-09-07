"use client";

import { CurrencyInput } from "@/components/ui/currency-input";
import { Field, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { REFERENCE_CURRENCY } from "@/config/currencies";
import { t } from "@/lib/i18n";
import type { OnboardingAnswers } from "../schema";
import { useFieldError } from "../step-context";
import { StepHeading } from "../step-heading";

export function PrimaryResidenceStep({ answers }: { answers: OnboardingAnswers }) {
  const pr = answers.primaryResidence;
  const valueError = useFieldError("valueCents");
  const debtError = useFieldError("remainingDebtCents");
  return (
    <div className="flex flex-col gap-6">
      <StepHeading
        title={t("onboarding.primaryResidence.title")}
        text={t("onboarding.primaryResidence.text")}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="valueCents" label={t("onboarding.primaryResidence.value")} error={valueError}>
          <CurrencyInput
            id="valueCents"
            name="valueCents"
            currency={REFERENCE_CURRENCY}
            defaultCents={pr?.valueCents ?? null}
            required
            invalid={Boolean(valueError)}
            describedBy={describedBy("valueCents", false, Boolean(valueError))}
          />
        </Field>
        <Field
          id="remainingDebtCents"
          label={t("onboarding.primaryResidence.remainingDebt")}
          optional
          error={debtError}
        >
          <CurrencyInput
            id="remainingDebtCents"
            name="remainingDebtCents"
            currency={REFERENCE_CURRENCY}
            defaultCents={pr?.remainingDebtCents ?? null}
            invalid={Boolean(debtError)}
          />
        </Field>
        <Field
          id="monthlyPaymentCents"
          label={t("onboarding.primaryResidence.monthlyPayment")}
          optional
        >
          <CurrencyInput
            id="monthlyPaymentCents"
            name="monthlyPaymentCents"
            currency={REFERENCE_CURRENCY}
            defaultCents={pr?.monthlyPaymentCents ?? null}
          />
        </Field>
        <Field
          id="purchasePriceCents"
          label={t("onboarding.primaryResidence.purchasePrice")}
          optional
        >
          <CurrencyInput
            id="purchasePriceCents"
            name="purchasePriceCents"
            currency={REFERENCE_CURRENCY}
            defaultCents={pr?.purchasePriceCents ?? null}
          />
        </Field>
        <Field
          id="purchaseDate"
          label={t("onboarding.primaryResidence.purchaseDate")}
          optional
          error={useFieldError("purchaseDate")}
        >
          <Input
            id="purchaseDate"
            name="purchaseDate"
            type="date"
            defaultValue={pr?.purchaseDate ?? ""}
          />
        </Field>
        <Field
          id="location"
          label={t("onboarding.primaryResidence.location")}
          hint={t("onboarding.primaryResidence.locationHint")}
          optional
        >
          <Input
            id="location"
            name="location"
            defaultValue={pr?.location ?? ""}
            maxLength={120}
            aria-describedby="location-hint"
          />
        </Field>
      </div>
    </div>
  );
}
