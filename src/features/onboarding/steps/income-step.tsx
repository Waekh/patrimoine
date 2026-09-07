"use client";

import { CurrencyInput } from "@/components/ui/currency-input";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { INCOME_FREQUENCIES, INCOME_TYPES } from "@/config/categories";
import { REFERENCE_CURRENCY } from "@/config/currencies";
import { messages, t } from "@/lib/i18n";
import { ItemRows } from "../item-rows";
import type { IncomeItem, OnboardingAnswers } from "../schema";
import { useFieldError } from "../step-context";
import { StepHeading } from "../step-heading";

const EMPTY: IncomeItem = {
  name: "",
  type: "SALARY",
  amountCents: 0,
  frequency: "MONTHLY",
  currency: REFERENCE_CURRENCY,
};

function Row({ item, prefix }: { item: IncomeItem; prefix: string }) {
  const nameError = useFieldError(`${prefix}.name`);
  const amountError = useFieldError(`${prefix}.amountCents`);
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
      <Field id={`${prefix}.type`} label={t("income.type")}>
        <Select id={`${prefix}.type`} name={`${prefix}.type`} defaultValue={item.type}>
          {INCOME_TYPES.map((x) => (
            <option key={x} value={x}>
              {messages.income.types[x]}
            </option>
          ))}
        </Select>
      </Field>
      <Field id={`${prefix}.amountCents`} label={t("income.amount")} error={amountError}>
        <CurrencyInput
          id={`${prefix}.amountCents`}
          name={`${prefix}.amountCents`}
          currency={REFERENCE_CURRENCY}
          defaultCents={item.amountCents || null}
          required
          invalid={Boolean(amountError)}
        />
      </Field>
      <Field id={`${prefix}.frequency`} label={t("income.frequency")}>
        <Select
          id={`${prefix}.frequency`}
          name={`${prefix}.frequency`}
          defaultValue={item.frequency}
        >
          {INCOME_FREQUENCIES.map((x) => (
            <option key={x} value={x}>
              {messages.income.frequencies[x]}
            </option>
          ))}
        </Select>
      </Field>
      <input type="hidden" name={`${prefix}.currency`} value={REFERENCE_CURRENCY} />
    </div>
  );
}

export function IncomeStep({ answers }: { answers: OnboardingAnswers }) {
  return (
    <div className="flex flex-col gap-6">
      <StepHeading title={t("onboarding.income.title")} text={t("onboarding.income.text")} />
      <ItemRows<IncomeItem>
        initial={answers.income}
        empty={EMPTY}
        render={(item, prefix) => <Row item={item} prefix={prefix} />}
      />
    </div>
  );
}
