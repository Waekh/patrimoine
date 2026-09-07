"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Field, describedBy } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { PercentageInput } from "@/components/ui/percentage-input";
import { Notice } from "@/components/ui/states";
import { LIABILITY_TYPES } from "@/config/categories";
import {
  CURRENCY_CODES,
  REFERENCE_CURRENCY,
  isCurrencyCode,
  type CurrencyCode,
} from "@/config/currencies";
import { messages, t } from "@/lib/i18n";
import type { Liability } from "@/types/domain";
import { initialFormState } from "@/features/shared/form-state";
import { createLiabilityAction, updateLiabilityAction } from "./actions";

export interface LiabilityFormProps {
  liability?: Liability;
  assetOptions: Array<{ id: string; name: string }>;
  defaultLinkedAssetId?: string;
}

export function LiabilityForm({
  liability,
  assetOptions,
  defaultLinkedAssetId,
}: LiabilityFormProps) {
  const [state, action, pending] = useActionState(
    liability ? updateLiabilityAction : createLiabilityAction,
    initialFormState,
  );
  const fe = state.fieldErrors ?? {};
  const [currency, setCurrency] = useState<CurrencyCode>(liability?.currency ?? REFERENCE_CURRENCY);
  return (
    <form action={action} className="flex max-w-xl flex-col gap-5" noValidate>
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      {liability ? <input type="hidden" name="id" value={liability.id} /> : null}
      <Field id="type" label={t("liabilities.type")} error={fe.type}>
        <Select id="type" name="type" defaultValue={liability?.type ?? "MORTGAGE"}>
          {LIABILITY_TYPES.map((x) => (
            <option key={x} value={x}>
              {messages.liabilities.types[x]}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="name" label={t("common.name")} error={fe.name}>
        <Input
          id="name"
          name="name"
          defaultValue={liability?.name ?? ""}
          required
          maxLength={120}
          aria-invalid={Boolean(fe.name) || undefined}
          aria-describedby={describedBy("name", false, Boolean(fe.name))}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="currency" label={t("common.currency")} error={fe.currency}>
          <Select
            id="currency"
            name="currency"
            value={currency}
            onChange={(e) => isCurrencyCode(e.target.value) && setCurrency(e.target.value)}
          >
            {CURRENCY_CODES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="linkedAssetId"
          label={t("liabilities.linkedAsset")}
          optional
          error={fe.linkedAssetId}
        >
          <Select
            id="linkedAssetId"
            name="linkedAssetId"
            defaultValue={liability?.linkedAssetId ?? defaultLinkedAssetId ?? ""}
          >
            <option value="">{t("liabilities.noLinkedAsset")}</option>
            {assetOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="initialAmountCents"
          label={t("liabilities.initialAmount")}
          error={fe.initialAmountCents}
        >
          <CurrencyInput
            id="initialAmountCents"
            name="initialAmountCents"
            currency={currency}
            defaultCents={liability?.initialAmountCents ?? null}
            required
            invalid={Boolean(fe.initialAmountCents)}
            describedBy={describedBy("initialAmountCents", false, Boolean(fe.initialAmountCents))}
          />
        </Field>
        <Field
          id="remainingAmountCents"
          label={t("liabilities.remainingAmount")}
          error={fe.remainingAmountCents}
        >
          <CurrencyInput
            id="remainingAmountCents"
            name="remainingAmountCents"
            currency={currency}
            defaultCents={liability?.remainingAmountCents ?? null}
            required
            invalid={Boolean(fe.remainingAmountCents)}
            describedBy={describedBy(
              "remainingAmountCents",
              false,
              Boolean(fe.remainingAmountCents),
            )}
          />
        </Field>
        <Field
          id="interestRateBps"
          label={t("liabilities.interestRate")}
          optional
          error={fe.interestRateBps}
        >
          <PercentageInput
            id="interestRateBps"
            name="interestRateBps"
            defaultBps={liability?.interestRateBps ?? null}
            invalid={Boolean(fe.interestRateBps)}
          />
        </Field>
        <Field
          id="monthlyPaymentCents"
          label={t("liabilities.monthlyPayment")}
          optional
          error={fe.monthlyPaymentCents}
        >
          <CurrencyInput
            id="monthlyPaymentCents"
            name="monthlyPaymentCents"
            currency={currency}
            defaultCents={liability?.monthlyPaymentCents ?? null}
          />
        </Field>
        <Field id="startDate" label={t("liabilities.startDate")} optional error={fe.startDate}>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={liability?.startDate ?? ""}
          />
        </Field>
        <Field id="endDate" label={t("liabilities.endDate")} optional error={fe.endDate}>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={liability?.endDate ?? ""}
            aria-invalid={Boolean(fe.endDate) || undefined}
            aria-describedby={describedBy("endDate", false, Boolean(fe.endDate))}
          />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending}>
          {liability ? t("common.save") : t("liabilities.add")}
        </Button>
        <Link
          href="/liabilities"
          className="text-fg-muted text-sm underline-offset-2 hover:underline"
        >
          {t("common.cancel")}
        </Link>
      </div>
    </form>
  );
}
