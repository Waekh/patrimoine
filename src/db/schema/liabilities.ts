import { bigint, date, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { currencyCodeEnum, liabilityTypeEnum } from "./enums";
import { ownerPolicies } from "./rls";
import { assets } from "./assets";
import { users } from "./users";

export const liabilities = pgTable(
  "liabilities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: liabilityTypeEnum("type").notNull(),
    name: text("name").notNull(),
    currency: currencyCodeEnum("currency").notNull(),
    initialAmountCents: bigint("initial_amount_cents", { mode: "number" }).notNull(),
    remainingAmountCents: bigint("remaining_amount_cents", { mode: "number" }).notNull(),
    /** Annual rate in basis points (1.25 % = 125). */
    interestRateBps: integer("interest_rate_bps"),
    monthlyPaymentCents: bigint("monthly_payment_cents", { mode: "number" }),
    startDate: date("start_date"),
    endDate: date("end_date"),
    linkedAssetId: uuid("linked_asset_id").references(() => assets.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("liabilities_user_id_idx").on(t.userId),
    index("liabilities_linked_asset_idx").on(t.linkedAssetId),
    ...ownerPolicies("liabilities", t.userId),
  ],
).enableRLS();
