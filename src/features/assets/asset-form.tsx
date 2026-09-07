"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Field, describedBy } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Notice } from "@/components/ui/states";
import {
  ASSET_CATEGORIES,
  MARKET_VALUABLE_CATEGORIES,
  PROPERTY_TYPES,
  type AssetCategory,
  type ValuationType,
} from "@/config/categories";
import { CURRENCY_CODES, REFERENCE_CURRENCY, type CurrencyCode } from "@/config/currencies";
import { isCurrencyCode } from "@/config/currencies";
import { messages, t } from "@/lib/i18n";
import type { AssetWithDetails } from "@/types/domain";
import { initialFormState } from "@/features/shared/form-state";
import { createAssetAction, updateAssetAction } from "./actions";

export interface AssetFormProps {
  asset?: AssetWithDetails;
  defaultCategory?: AssetCategory;
}

export function AssetForm({ asset, defaultCategory }: AssetFormProps) {
  const [state, action, pending] = useActionState(
    asset ? updateAssetAction : createAssetAction,
    initialFormState,
  );
  const fe = state.fieldErrors ?? {};
  const [category, setCategory] = useState<AssetCategory>(
    asset?.category ?? defaultCategory ?? "CASH",
  );
  const [currency, setCurrency] = useState<CurrencyCode>(asset?.currency ?? REFERENCE_CURRENCY);
  const [valuationType, setValuationType] = useState<ValuationType>(
    asset?.valuationType ?? "MANUAL",
  );
  const marketCapable = MARKET_VALUABLE_CATEGORIES.includes(category);
  const isRealEstate = category === "REAL_ESTATE";

  return (
    <form action={action} className="flex max-w-xl flex-col gap-5" noValidate>
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      {asset ? <input type="hidden" name="id" value={asset.id} /> : null}

      <Field id="category" label={t("assets.category")} error={fe.category}>
        <Select
          id="category"
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as AssetCategory)}
        >
          {ASSET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {messages.assets.categories[c]}
            </option>
          ))}
        </Select>
      </Field>

      <Field id="name" label={t("common.name")} error={fe.name}>
        <Input
          id="name"
          name="name"
          defaultValue={asset?.name ?? ""}
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
        <Field id="manualValueCents" label={t("assets.currentValue")} error={fe.manualValueCents}>
          <CurrencyInput
            id="manualValueCents"
            name="manualValueCents"
            currency={currency}
            defaultCents={asset?.manualValueCents ?? asset?.currentValueCents ?? null}
            required
            invalid={Boolean(fe.manualValueCents)}
            describedBy={describedBy("manualValueCents", false, Boolean(fe.manualValueCents))}
          />
        </Field>
      </div>

      <Field
        id="purchaseValueCents"
        label={t("assets.purchaseValue")}
        optional
        error={fe.purchaseValueCents}
      >
        <CurrencyInput
          id="purchaseValueCents"
          name="purchaseValueCents"
          currency={currency}
          defaultCents={asset?.purchaseValueCents ?? null}
          invalid={Boolean(fe.purchaseValueCents)}
        />
      </Field>

      {marketCapable ? (
        <fieldset className="border-border flex flex-col gap-4 rounded-md border p-4">
          <legend className="px-1 text-sm font-medium">{t("assets.valuationType")}</legend>
          <Field id="valuationType" label={t("assets.valuationType")} error={fe.valuationType}>
            <Select
              id="valuationType"
              name="valuationType"
              value={valuationType}
              onChange={(e) => setValuationType(e.target.value as ValuationType)}
            >
              <option value="MANUAL">{t("assets.valuationManual")}</option>
              <option value="MARKET">{t("assets.valuationMarket")}</option>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="ticker"
              label={t("assets.ticker")}
              optional={valuationType !== "MARKET"}
              error={fe.ticker}
            >
              <Input
                id="ticker"
                name="ticker"
                defaultValue={asset?.ticker ?? ""}
                placeholder="CW8"
                maxLength={16}
                aria-invalid={Boolean(fe.ticker) || undefined}
                aria-describedby={describedBy("ticker", false, Boolean(fe.ticker))}
              />
            </Field>
            <Field
              id="quantity"
              label={t("assets.quantity")}
              optional={valuationType !== "MARKET"}
              error={fe.quantity}
            >
              <Input
                id="quantity"
                name="quantity"
                inputMode="decimal"
                defaultValue={asset?.quantity ?? ""}
                placeholder="0"
                aria-invalid={Boolean(fe.quantity) || undefined}
                aria-describedby={describedBy("quantity", false, Boolean(fe.quantity))}
              />
            </Field>
          </div>
        </fieldset>
      ) : (
        <input type="hidden" name="valuationType" value="MANUAL" />
      )}

      {isRealEstate ? (
        <fieldset className="border-border flex flex-col gap-4 rounded-md border p-4">
          <legend className="px-1 text-sm font-medium">
            {messages.assets.categories.REAL_ESTATE}
          </legend>
          <Field
            id="realEstate.propertyType"
            label={t("onboarding.realEstate.propertyType")}
            error={fe["realEstate.propertyType"] ?? fe.realEstate}
          >
            <Select
              id="realEstate.propertyType"
              name="realEstate.propertyType"
              defaultValue={asset?.realEstate?.propertyType ?? "PRIMARY_RESIDENCE"}
            >
              {PROPERTY_TYPES.map((p) => (
                <option key={p} value={p}>
                  {messages.assets.propertyTypes[p]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="realEstate.purchasePriceCents"
              label={t("onboarding.primaryResidence.purchasePrice")}
              optional
              error={fe["realEstate.purchasePriceCents"]}
            >
              <CurrencyInput
                id="realEstate.purchasePriceCents"
                name="realEstate.purchasePriceCents"
                currency={currency}
                defaultCents={asset?.realEstate?.purchasePriceCents ?? null}
              />
            </Field>
            <Field
              id="realEstate.purchaseDate"
              label={t("onboarding.primaryResidence.purchaseDate")}
              optional
              error={fe["realEstate.purchaseDate"]}
            >
              <Input
                id="realEstate.purchaseDate"
                name="realEstate.purchaseDate"
                type="date"
                defaultValue={asset?.realEstate?.purchaseDate ?? ""}
              />
            </Field>
            <Field
              id="realEstate.location"
              label={t("onboarding.primaryResidence.location")}
              hint={t("onboarding.primaryResidence.locationHint")}
              optional
              error={fe["realEstate.location"]}
            >
              <Input
                id="realEstate.location"
                name="realEstate.location"
                defaultValue={asset?.realEstate?.location ?? ""}
                maxLength={120}
                aria-describedby="realEstate.location-hint"
              />
            </Field>
            <Field
              id="realEstate.monthlyRentCents"
              label={t("onboarding.realEstate.monthlyRent")}
              optional
              error={fe["realEstate.monthlyRentCents"]}
            >
              <CurrencyInput
                id="realEstate.monthlyRentCents"
                name="realEstate.monthlyRentCents"
                currency={currency}
                defaultCents={asset?.realEstate?.monthlyRentCents ?? null}
              />
            </Field>
          </div>
        </fieldset>
      ) : null}

      <Field id="description" label={t("common.description")} optional error={fe.description}>
        <Textarea
          id="description"
          name="description"
          defaultValue={asset?.description ?? ""}
          maxLength={500}
        />
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending}>
          {asset ? t("common.save") : t("assets.add")}
        </Button>
        <Link href="/assets" className="text-fg-muted text-sm underline-offset-2 hover:underline">
          {t("common.cancel")}
        </Link>
      </div>
    </form>
  );
}
