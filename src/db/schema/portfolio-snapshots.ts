import { bigint, date, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { currencyCodeEnum } from "./enums";
import { ownerPolicies } from "./rls";
import { users } from "./users";

/** Daily snapshot of the wealth summary; one row per user and day. */
export const portfolioSnapshots = pgTable(
  "portfolio_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    currency: currencyCodeEnum("currency").notNull(),
    grossAssetsCents: bigint("gross_assets_cents", { mode: "number" }).notNull(),
    liabilitiesCents: bigint("liabilities_cents", { mode: "number" }).notNull(),
    netWorthCents: bigint("net_worth_cents", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("portfolio_snapshots_user_date_idx").on(t.userId, t.date),
    ...ownerPolicies("portfolio_snapshots", t.userId),
  ],
).enableRLS();
