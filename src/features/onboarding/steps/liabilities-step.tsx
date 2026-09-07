"use client";

import { CurrencyInput } from "@/components/ui/currency-input";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { PercentageInput } from "@/components/ui/percentage-input";
import { LIABILITY_TYPES } from "@/config/categories";
import { REFERENCE_CURRENCY } from "@/config/currencies";
import { messages, t } from "@/lib/i18n";
import { ItemRows } from "../item-rows";
import type { LiabilityItem, OnboardingAnswers } from "../schema";
import { useFieldError } from "../step-context";
import { StepHeading } from "../step-heading";

const EMPTY: LiabilityItem = {
  name: "",
  type: "CONSUMER_LOAN",
  initialAmountCents: 0,
  remainingAmountCents: 0,
  currency: REFERENCE_CURRENCY,
};

function Row({ item, prefix }: { item: LiabilityItem; prefix: string }) {
  const nameError = useFieldError(`${prefix}.name`);
  const initialError = useFieldError(`${prefix}.initialAmountCents`);
  const remainingError = useFieldError(`${prefix}.remainingAmountCents`);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id={`${prefix}.name`} label={t("common.name")} error={nameError}>
        <Input
          id={`${prefix}.name`}
          name={`${prefix}.name`}
          defaultValue={item.name}
          required
          maxLength={120}
          aria-invalid={Boolean(nameError) || undefined}
        />
      </Field>
      <Field id={`${prefix}.type`} label={t("liabilities.type")}>
        <Select id={`${prefix}.type`} name={`${prefix}.type`} defaultValue={item.type}>
          {LIABILITY_TYPES.map((x) => (
            <option key={x} value={x}>
              {messages.liabilities.types[x]}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        id={`${prefix}.initialAmountCents`}
        label={t("liabilities.initialAmount")}
        error={initialError}
      >
        <CurrencyInput
          id={`${prefix}.initialAmountCents`}
          name={`${prefix}.initialAmountCents`}
          currency={REFERENCE_CURRENCY}
          defaultCents={item.initialAmountCents || null}
          required
          invalid={Boolean(initialError)}
        />
      </Field>
      <Field
        id={`${prefix}.remainingAmountCents`}
        label={t("liabilities.remainingAmount")}
        error={remainingError}
      >
        <CurrencyInput
          id={`${prefix}.remainingAmountCents`}
          name={`${prefix}.remainingAmountCents`}
          currency={REFERENCE_CURRENCY}
          defaultCents={item.remainingAmountCents || null}
          required
          invalid={Boolean(remainingError)}
        />
      </Field>
      <Field id={`${prefix}.monthlyPaymentCents`} label={t("liabilities.monthlyPayment")} optional>
        <CurrencyInput
          id={`${prefix}.monthlyPaymentCents`}
          name={`${prefix}.monthlyPaymentCents`}
          currency={REFERENCE_CURRENCY}
          defaultCents={item.monthlyPaymentCents ?? null}
        />
      </Field>
      <Field id={`${prefix}.interestRateBps`} label={t("liabilities.interestRate")} optional>
        <PercentageInput
          id={`${prefix}.interestRateBps`}
          name={`${prefix}.interestRateBps`}
          defaultBps={item.interestRateBps ?? null}
        />
      </Field>
      <input type="hidden" name={`${prefix}.currency`} value={REFERENCE_CURRENCY} />
    </div>
  );
}

export function LiabilitiesStep({ answers }: { answers: OnboardingAnswers }) {
  return (
    <div className="flex flex-col gap-6">
      <StepHeading
        title={t("onboarding.liabilities.title")}
        text={t("onboarding.liabilities.text")}
      />
      <ItemRows<LiabilityItem>
        initial={answers.liabilities}
        empty={EMPTY}
        render={(item, prefix) => <Row item={item} prefix={prefix} />}
      />
    </div>
  );
}
