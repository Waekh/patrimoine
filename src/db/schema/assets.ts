import {
  bigint,
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { assetCategoryEnum, currencyCodeEnum, valuationTypeEnum } from "./enums";
import { ownerPolicies } from "./rls";
import { users } from "./users";

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: assetCategoryEnum("category").notNull(),
    subcategory: text("subcategory"),
    name: text("name").notNull(),
    description: text("description"),
    currency: currencyCodeEnum("currency").notNull(),
    /** Effective value used by every calculation, in minor units of `currency`. */
    currentValueCents: bigint("current_value_cents", { mode: "number" }).notNull(),
    purchaseValueCents: bigint("purchase_value_cents", { mode: "number" }),
    /** Number of units held (shares, tokens). Stored as exact decimal string. */
    quantity: numeric("quantity", { precision: 24, scale: 8 }),
    unitPriceCents: bigint("unit_price_cents", { mode: "number" }),
    ticker: text("ticker"),
    provider: text("provider"),
    valuationType: valuationTypeEnum("valuation_type").notNull().default("MANUAL"),
    /** Value entered by the user; equals currentValueCents while valuation is MANUAL. */
    manualValueCents: bigint("manual_value_cents", { mode: "number" }),
    valuedAt: timestamp("valued_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("assets_user_id_idx").on(t.userId), ...ownerPolicies("assets", t.userId)],
).enableRLS();
