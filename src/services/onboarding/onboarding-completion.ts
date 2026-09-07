import "server-only";
import { withUserDb, type UserTx } from "@/db/user-db";
import { insertAsset, upsertRealEstateDetails } from "@/db/queries/assets";
import { insertIncomeSource } from "@/db/queries/income-sources";
import { insertLiability } from "@/db/queries/liabilities";
import { markOnboardingCompleted } from "@/db/queries/onboarding";
import { logger } from "@/lib/logger";
import { appError, err, ok, type Result } from "@/lib/result";
import { recalculateAndSnapshot } from "@/services/finance/wealth-overview";
import type { OnboardingAnswers, SimpleAssetItem } from "@/features/onboarding/schema";
import { LIST_STEPS } from "@/features/onboarding/steps";
import { messages } from "@/lib/i18n";

async function createSimpleAssets(
  tx: UserTx,
  userId: string,
  items: SimpleAssetItem[],
  category: keyof typeof messages.assets.categories,
) {
  for (const item of items) {
    await insertAsset(tx, {
      userId,
      category,
      name: item.name,
      currency: item.currency,
      currentValueCents: item.valueCents,
      manualValueCents: item.valueCents,
      purchaseValueCents: item.purchaseValueCents ?? null,
      ticker: item.ticker ?? null,
      valuationType: "MANUAL",
      isActive: true,
    });
  }
}

/**
 * Turns the questionnaire draft into real records in one transaction:
 * assets (+ real estate details), mortgages linked to their property,
 * other liabilities, income sources, then the first snapshot.
 */
export async function completeOnboarding(
  userId: string,
  answers: OnboardingAnswers,
): Promise<Result<void>> {
  try {
    await withUserDb(userId, async (tx) => {
      if (answers.situation.hasPrimaryResidence && answers.primaryResidence) {
        const pr = answers.primaryResidence;
        const asset = await insertAsset(tx, {
          userId,
          category: "REAL_ESTATE",
          name: messages.assets.propertyTypes.PRIMARY_RESIDENCE,
          currency: "EUR",
          currentValueCents: pr.valueCents,
          manualValueCents: pr.valueCents,
          purchaseValueCents: pr.purchasePriceCents ?? null,
          valuationType: "MANUAL",
          isActive: true,
        });
        await upsertRealEstateDetails(tx, {
          assetId: asset.id,
          userId,
          propertyType: "PRIMARY_RESIDENCE",
          purchasePriceCents: pr.purchasePriceCents ?? null,
          purchaseDate: pr.purchaseDate ?? null,
          location: pr.location ?? null,
        });
        if (pr.remainingDebtCents && pr.remainingDebtCents > 0) {
          await insertLiability(tx, {
            userId,
            type: "MORTGAGE",
            name: `${messages.liabilities.types.MORTGAGE} — ${messages.assets.propertyTypes.PRIMARY_RESIDENCE}`,
            currency: "EUR",
            initialAmountCents: pr.purchasePriceCents ?? pr.remainingDebtCents,
            remainingAmountCents: pr.remainingDebtCents,
            monthlyPaymentCents: pr.monthlyPaymentCents ?? null,
            linkedAssetId: asset.id,
          });
        }
      }
      if (answers.situation.hasRealEstate) {
        for (const item of answers.realEstate) {
          const asset = await insertAsset(tx, {
            userId,
            category: "REAL_ESTATE",
            name: item.name,
            currency: item.currency,
            currentValueCents: item.valueCents,
            manualValueCents: item.valueCents,
            valuationType: "MANUAL",
            isActive: true,
          });
          await upsertRealEstateDetails(tx, {
            assetId: asset.id,
            userId,
            propertyType: item.propertyType,
            monthlyRentCents: item.monthlyRentCents ?? null,
          });
          if (item.remainingDebtCents && item.remainingDebtCents > 0) {
            await insertLiability(tx, {
              userId,
              type: "MORTGAGE",
              name: `${messages.liabilities.types.MORTGAGE} — ${item.name}`,
              currency: item.currency,
              initialAmountCents: item.remainingDebtCents,
              remainingAmountCents: item.remainingDebtCents,
              linkedAssetId: asset.id,
            });
          }
        }
      }
      for (const [stepId, config] of Object.entries(LIST_STEPS)) {
        const visible = isListStepDeclared(stepId, answers);
        if (!visible) continue;
        const items = answers[config.key];
        if (Array.isArray(items))
          await createSimpleAssets(tx, userId, items as SimpleAssetItem[], config.category);
      }
      if (answers.situation.hasLiabilities) {
        for (const item of answers.liabilities) {
          await insertLiability(tx, {
            userId,
            type: item.type,
            name: item.name,
            currency: item.currency,
            initialAmountCents: item.initialAmountCents,
            remainingAmountCents: item.remainingAmountCents,
            monthlyPaymentCents: item.monthlyPaymentCents ?? null,
            interestRateBps: item.interestRateBps ?? null,
          });
        }
      }
      if (answers.situation.hasIncome) {
        for (const item of answers.income) {
          await insertIncomeSource(tx, {
            userId,
            type: item.type,
            name: item.name,
            currency: item.currency,
            amountCents: item.amountCents,
            frequency: item.frequency,
          });
        }
      }
      await markOnboardingCompleted(tx, userId);
      await recalculateAndSnapshot(tx, userId);
    });
    return ok(undefined);
  } catch (error) {
    logger.error("onboarding.complete.failed", error, { userId });
    return err(appError("INTERNAL", "Une erreur est survenue. Veuillez réessayer."));
  }
}

function isListStepDeclared(stepId: string, answers: OnboardingAnswers): boolean {
  const s = answers.situation;
  const inv = answers.investments;
  switch (stepId) {
    case "BANK_ACCOUNTS":
      return s.hasBankAccounts;
    case "SAVINGS":
      return s.hasSavings;
    case "ETF":
      return s.hasInvestments && inv.ETF;
    case "STOCKS":
      return s.hasInvestments && inv.STOCK;
    case "PEA":
      return s.hasInvestments && inv.PEA;
    case "LIFE_INSURANCE":
      return s.hasInvestments && inv.LIFE_INSURANCE;
    case "PEE":
      return s.hasInvestments && inv.PEE;
    case "SCPI":
      return s.hasScpi;
    case "CRYPTO":
      return s.hasCrypto;
    case "OTHER_ASSETS":
      return s.hasOtherAssets;
    default:
      return false;
  }
}
