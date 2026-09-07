import { bigint, date, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { propertyTypeEnum } from "./enums";
import { ownerPolicies } from "./rls";
import { assets } from "./assets";
import { users } from "./users";

/**
 * One-to-one extension of an asset of category REAL_ESTATE. `remaining_debt`
 * is deliberately absent: it lives in `liabilities.linked_asset_id`.
 */
export const realEstateDetails = pgTable(
  "real_estate_details",
  {
    assetId: uuid("asset_id")
      .primaryKey()
      .references(() => assets.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    propertyType: propertyTypeEnum("property_type").notNull(),
    purchasePriceCents: bigint("purchase_price_cents", { mode: "number" }),
    purchaseDate: date("purchase_date"),
    /** Free text, never rendered publicly. */
    location: text("location"),
    monthlyRentCents: bigint("monthly_rent_cents", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [...ownerPolicies("real_estate_details", t.userId)],
).enableRLS();
