"use client";

import { CurrencyInput } from "@/components/ui/currency-input";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { PROPERTY_TYPES } from "@/config/categories";
import { REFERENCE_CURRENCY } from "@/config/currencies";
import { messages, t } from "@/lib/i18n";
import { ItemRows } from "../item-rows";
import type { OnboardingAnswers, RealEstateItem } from "../schema";
import { useFieldError } from "../step-context";
import { StepHeading } from "../step-heading";

const EMPTY: RealEstateItem = {
  name: "",
  propertyType: "RENTAL",
  valueCents: 0,
  currency: REFERENCE_CURRENCY,
};

function Row({ item, prefix }: { item: RealEstateItem; prefix: string }) {
  const nameError = useFieldError(`${prefix}.name`);
  const valueError = useFieldError(`${prefix}.valueCents`);
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
      <Field id={`${prefix}.propertyType`} label={t("onboarding.realEstate.propertyType")}>
        <Select
          id={`${prefix}.propertyType`}
          name={`${prefix}.propertyType`}
          defaultValue={item.propertyType}
        >
          {PROPERTY_TYPES.filter((p) => p !== "PRIMARY_RESIDENCE").map((p) => (
            <option key={p} value={p}>
              {messages.assets.propertyTypes[p]}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        id={`${prefix}.valueCents`}
        label={t("onboarding.primaryResidence.value")}
        error={valueError}
      >
        <CurrencyInput
          id={`${prefix}.valueCents`}
          name={`${prefix}.valueCents`}
          currency={REFERENCE_CURRENCY}
          defaultCents={item.valueCents || null}
          required
          invalid={Boolean(valueError)}
        />
      </Field>
      <Field
        id={`${prefix}.remainingDebtCents`}
        label={t("onboarding.primaryResidence.remainingDebt")}
        optional
      >
        <CurrencyInput
          id={`${prefix}.remainingDebtCents`}
          name={`${prefix}.remainingDebtCents`}
          currency={REFERENCE_CURRENCY}
          defaultCents={item.remainingDebtCents ?? null}
        />
      </Field>
      <Field
        id={`${prefix}.monthlyRentCents`}
        label={t("onboarding.realEstate.monthlyRent")}
        optional
      >
        <CurrencyInput
          id={`${prefix}.monthlyRentCents`}
          name={`${prefix}.monthlyRentCents`}
          currency={REFERENCE_CURRENCY}
          defaultCents={item.monthlyRentCents ?? null}
        />
      </Field>
      <input type="hidden" name={`${prefix}.currency`} value={REFERENCE_CURRENCY} />
    </div>
  );
}

export function RealEstateStep({ answers }: { answers: OnboardingAnswers }) {
  return (
    <div className="flex flex-col gap-6">
      <StepHeading
        title={t("onboarding.realEstate.title")}
        text={t("onboarding.realEstate.text")}
      />
      <ItemRows<RealEstateItem>
        initial={answers.realEstate}
        empty={EMPTY}
        render={(item, prefix) => <Row item={item} prefix={prefix} />}
      />
    </div>
  );
}
