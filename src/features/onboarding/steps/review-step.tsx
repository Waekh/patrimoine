import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { REFERENCE_CURRENCY } from "@/config/currencies";
import { formatCurrency } from "@/lib/formatting";
import { messages, t } from "@/lib/i18n";
import {
  calculateWealthSummary,
  type AssetLike,
  type LiabilityLike,
} from "@/services/finance/wealth-calculation";
import type { OnboardingAnswers } from "../schema";
import { LIST_STEPS, isStepVisible } from "../steps";
import { StepHeading } from "../step-heading";

/** Preview of the future patrimony, computed by the same service as the dashboard. */
export function summarizeAnswers(answers: OnboardingAnswers) {
  const assets: Array<AssetLike & { name: string }> = [];
  const liabilities: Array<LiabilityLike & { name: string }> = [];
  if (answers.situation.hasPrimaryResidence && answers.primaryResidence) {
    assets.push({
      id: "pr",
      name: messages.assets.propertyTypes.PRIMARY_RESIDENCE,
      category: "REAL_ESTATE",
      currency: "EUR",
      currentValueCents: answers.primaryResidence.valueCents,
      isActive: true,
    });
    if (answers.primaryResidence.remainingDebtCents)
      liabilities.push({
        id: "pr-debt",
        name: messages.liabilities.types.MORTGAGE,
        currency: "EUR",
        remainingAmountCents: answers.primaryResidence.remainingDebtCents,
      });
  }
  if (answers.situation.hasRealEstate) {
    answers.realEstate.forEach((item, i) => {
      assets.push({
        id: `re${i}`,
        name: item.name,
        category: "REAL_ESTATE",
        currency: item.currency,
        currentValueCents: item.valueCents,
        isActive: true,
      });
      if (item.remainingDebtCents)
        liabilities.push({
          id: `re-debt${i}`,
          name: `${messages.liabilities.types.MORTGAGE} — ${item.name}`,
          currency: item.currency,
          remainingAmountCents: item.remainingDebtCents,
        });
    });
  }
  for (const [stepId, config] of Object.entries(LIST_STEPS)) {
    if (!isStepVisible(stepId as keyof typeof LIST_STEPS, answers)) continue;
    const items = answers[config.key];
    if (!Array.isArray(items)) continue;
    items.forEach((item, i) => {
      if ("valueCents" in item)
        assets.push({
          id: `${stepId}${i}`,
          name: item.name,
          category: config.category,
          currency: item.currency,
          currentValueCents: item.valueCents,
          isActive: true,
        });
    });
  }
  if (answers.situation.hasLiabilities) {
    answers.liabilities.forEach((item, i) =>
      liabilities.push({
        id: `l${i}`,
        name: item.name,
        currency: item.currency,
        remainingAmountCents: item.remainingAmountCents,
      }),
    );
  }
  return {
    assets,
    liabilities,
    summary: calculateWealthSummary(assets, liabilities, { currency: REFERENCE_CURRENCY }),
  };
}

export function ReviewStep({ answers }: { answers: OnboardingAnswers }) {
  const { assets, liabilities, summary } = summarizeAnswers(answers);
  return (
    <div className="flex flex-col gap-6">
      <StepHeading title={t("onboarding.reviewTitle")} text={t("onboarding.reviewText")} />
      <Card className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-fg-muted text-xs tracking-wide uppercase">{t("wealth.grossAssets")}</p>
          <p className="tabular font-mono text-lg font-semibold">
            {formatCurrency(summary.grossAssets)}
          </p>
        </div>
        <div>
          <p className="text-fg-muted text-xs tracking-wide uppercase">
            {t("wealth.totalLiabilities")}
          </p>
          <p className="tabular font-mono text-lg font-semibold">
            {formatCurrency(summary.totalLiabilities)}
          </p>
        </div>
        <div>
          <p className="text-fg-muted text-xs tracking-wide uppercase">{t("wealth.netWorth")}</p>
          <p className="tabular font-mono text-lg font-semibold">
            {formatCurrency(summary.netWorth)}
          </p>
        </div>
      </Card>
      <Card>
        <h2 className="mb-2 text-sm font-semibold">{t("nav.assets")}</h2>
        {assets.length === 0 ? (
          <p className="text-fg-muted text-sm">{t("assets.empty")}</p>
        ) : (
          <ul className="divide-border divide-y text-sm">
            {assets.map((a) => (
              <li key={a.id} className="flex justify-between gap-3 py-2">
                <span>
                  {a.name}{" "}
                  <span className="text-fg-muted">· {messages.assets.categories[a.category]}</span>
                </span>
                <span className="tabular font-mono">
                  {formatCurrency({ amountCents: a.currentValueCents, currency: a.currency })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <h2 className="mb-2 text-sm font-semibold">{t("nav.liabilities")}</h2>
        {liabilities.length === 0 ? (
          <p className="text-fg-muted text-sm">{t("liabilities.empty")}</p>
        ) : (
          <ul className="divide-border divide-y text-sm">
            {liabilities.map((l) => (
              <li key={l.id} className="flex justify-between gap-3 py-2">
                <span>{l.name}</span>
                <span className="tabular font-mono">
                  {formatCurrency({ amountCents: l.remainingAmountCents, currency: l.currency })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <div className="flex items-center gap-3">
        <Link href="/onboarding?step=GENERATE">
          <Button>{t("common.next")}</Button>
        </Link>
        <Link
          href="/onboarding?step=SITUATION"
          className="text-fg-muted text-sm underline-offset-2 hover:underline"
        >
          {t("common.edit")}
        </Link>
      </div>
    </div>
  );
}
