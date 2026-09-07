import { bigint, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { currencyCodeEnum, incomeFrequencyEnum, incomeTypeEnum } from "./enums";
import { ownerPolicies } from "./rls";
import { users } from "./users";

export const incomeSources = pgTable(
  "income_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: incomeTypeEnum("type").notNull(),
    name: text("name").notNull(),
    currency: currencyCodeEnum("currency").notNull(),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    frequency: incomeFrequencyEnum("frequency").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("income_sources_user_id_idx").on(t.userId),
    ...ownerPolicies("income_sources", t.userId),
  ],
).enableRLS();
