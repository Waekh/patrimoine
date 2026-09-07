import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { requireDatabaseUrl } from "./lib/db-url";
import { hashPassword } from "../src/lib/auth/local/password";
import { DEMO_ASSETS, DEMO_LIABILITIES, DEMO_USER } from "../src/services/demo/demo-dataset";
import { calculateWealthSummary } from "../src/services/finance/wealth-calculation";

/**
 * Development seed: creates the demo account (local auth adapter) with the
 * demonstration patrimony, its onboarding marked as completed and a first
 * snapshot. Idempotent: re-running replaces the demo data.
 */
export async function seedDemoUser(url: string): Promise<void> {
  const sql = postgres(url, { max: 1 });
  try {
    await sql.begin(async (tx) => {
      await tx`delete from public.users where id = ${DEMO_USER.id}`;
      await tx`delete from auth.users where id = ${DEMO_USER.id}`;
      await tx`insert into auth.users (id, email, encrypted_password, email_confirmed_at) values (${DEMO_USER.id}, ${DEMO_USER.email}, ${hashPassword(DEMO_USER.password)}, now())`;
      await tx`insert into public.users (id, email) values (${DEMO_USER.id}, ${DEMO_USER.email})`;
      for (const asset of DEMO_ASSETS) {
        await tx`insert into public.assets (id, user_id, category, name, currency, current_value_cents, purchase_value_cents, manual_value_cents, valuation_type, ticker, is_active)
          values (${asset.id}, ${DEMO_USER.id}, ${asset.category}, ${asset.name}, ${asset.currency}, ${asset.currentValueCents}, ${asset.purchaseValueCents}, ${asset.manualValueCents}, ${asset.valuationType}, ${asset.ticker}, true)`;
        if (asset.realEstate) {
          await tx`insert into public.real_estate_details (asset_id, user_id, property_type, purchase_price_cents, purchase_date)
            values (${asset.id}, ${DEMO_USER.id}, ${asset.realEstate.propertyType}, ${asset.realEstate.purchasePriceCents}, ${asset.realEstate.purchaseDate})`;
        }
      }
      for (const l of DEMO_LIABILITIES) {
        await tx`insert into public.liabilities (id, user_id, type, name, currency, initial_amount_cents, remaining_amount_cents, interest_rate_bps, monthly_payment_cents, start_date, end_date, linked_asset_id)
          values (${l.id}, ${DEMO_USER.id}, ${l.type}, ${l.name}, ${l.currency}, ${l.initialAmountCents}, ${l.remainingAmountCents}, ${l.interestRateBps}, ${l.monthlyPaymentCents}, ${l.startDate}, ${l.endDate}, ${l.linkedAssetId})`;
      }
      const summary = calculateWealthSummary(DEMO_ASSETS, DEMO_LIABILITIES);
      // A short history so the evolution chart has something to show.
      const days = [30, 14, 0];
      for (const [i, ago] of days.entries()) {
        const date = new Date(Date.now() - ago * 86_400_000).toISOString().slice(0, 10);
        const factor = 1 - (days.length - 1 - i) * 0.012;
        await tx`insert into public.portfolio_snapshots (id, user_id, date, currency, gross_assets_cents, liabilities_cents, net_worth_cents)
          values (${randomUUID()}, ${DEMO_USER.id}, ${date}, ${summary.currency}, ${Math.round(summary.grossAssets.amountCents * factor)}, ${summary.totalLiabilities.amountCents}, ${Math.round(summary.grossAssets.amountCents * factor) - summary.totalLiabilities.amountCents})`;
      }
      await tx`insert into public.onboarding_progress (user_id, current_step, answers, completed_at) values (${DEMO_USER.id}, 0, '{}'::jsonb, now())`;
    });
  } finally {
    await sql.end();
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  seedDemoUser(requireDatabaseUrl())
    .then(() =>
      console.log(`Utilisateur de démonstration prêt : ${DEMO_USER.email} / ${DEMO_USER.password}`),
    )
    .catch((error: unknown) => {
      console.error("Échec du seed :", error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
