"use client";

import { CurrencyInput } from "@/components/ui/currency-input";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { REFERENCE_CURRENCY } from "@/config/currencies";
import { messages, t } from "@/lib/i18n";
import type { AssetCategory } from "@/config/categories";
import { ItemRows } from "../item-rows";
import type { OnboardingAnswers, SimpleAssetItem } from "../schema";
import { useFieldError } from "../step-context";
import { StepHeading } from "../step-heading";
import type { OnboardingStepId } from "../steps";

const HEADINGS: Partial<Record<OnboardingStepId, { title: string; text: string }>> = {
  BANK_ACCOUNTS: messages.onboarding.bank,
  SAVINGS: messages.onboarding.savings,
  ETF: messages.onboarding.etf,
  STOCKS: messages.onboarding.stocks,
  PEA: messages.onboarding.pea,
  LIFE_INSURANCE: messages.onboarding.lifeInsurance,
  PEE: messages.onboarding.pee,
  SCPI: messages.onboarding.scpi,
  CRYPTO: messages.onboarding.crypto,
  OTHER_ASSETS: messages.onboarding.otherAssets,
};

const EMPTY: SimpleAssetItem = { name: "", valueCents: 0, currency: REFERENCE_CURRENCY };

function Row({
  item,
  prefix,
  withTicker,
  defaultName,
}: {
  item: SimpleAssetItem;
  prefix: string;
  withTicker: boolean;
  defaultName: string;
}) {
  const nameError = useFieldError(`${prefix}.name`);
  const valueError = useFieldError(`${prefix}.valueCents`);
  const tickerError = useFieldError(`${prefix}.ticker`);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id={`${prefix}.name`} label={t("common.name")} error={nameError}>
        <Input
          id={`${prefix}.name`}
          name={`${prefix}.name`}
          defaultValue={item.name || defaultName}
          required
          maxLength={120}
          aria-invalid={Boolean(nameError) || undefined}
        />
      </Field>
      <Field id={`${prefix}.valueCents`} label={t("assets.currentValue")} error={valueError}>
        <CurrencyInput
          id={`${prefix}.valueCents`}
          name={`${prefix}.valueCents`}
          currency={REFERENCE_CURRENCY}
          defaultCents={item.valueCents || null}
          required
          invalid={Boolean(valueError)}
        />
      </Field>
      <Field id={`${prefix}.purchaseValueCents`} label={t("onboarding.etf.invested")} optional>
        <CurrencyInput
          id={`${prefix}.purchaseValueCents`}
          name={`${prefix}.purchaseValueCents`}
          currency={REFERENCE_CURRENCY}
          defaultCents={item.purchaseValueCents ?? null}
        />
      </Field>
      {withTicker ? (
        <Field id={`${prefix}.ticker`} label={t("assets.ticker")} optional error={tickerError}>
          <Input
            id={`${prefix}.ticker`}
            name={`${prefix}.ticker`}
            defaultValue={item.ticker ?? ""}
            maxLength={16}
            placeholder="CW8"
            aria-invalid={Boolean(tickerError) || undefined}
          />
        </Field>
      ) : null}
      <input type="hidden" name={`${prefix}.currency`} value={REFERENCE_CURRENCY} />
    </div>
  );
}

export function ListStep({
  step,
  config,
  answers,
}: {
  step: OnboardingStepId;
  config: { key: keyof OnboardingAnswers; category: AssetCategory; withTicker: boolean };
  answers: OnboardingAnswers;
}) {
  const heading = HEADINGS[step] ?? { title: messages.onboarding.steps[step], text: "" };
  const items = answers[config.key];
  const initial = Array.isArray(items) ? (items as SimpleAssetItem[]) : [];
  const defaultName = messages.assets.categories[config.category];
  return (
    <div className="flex flex-col gap-6">
      <StepHeading title={heading.title} text={heading.text} />
      <ItemRows<SimpleAssetItem>
        initial={initial}
        empty={EMPTY}
        render={(item, prefix) => (
          <Row
            item={item}
            prefix={prefix}
            withTicker={config.withTicker}
            defaultName={defaultName}
          />
        )}
      />
      <p className="text-fg-muted text-xs">{t("onboarding.emptyCategory")}</p>
    </div>
  );
}
