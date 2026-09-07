import type {
  assets,
  incomeSources,
  liabilities,
  onboardingProgress,
  portfolioSnapshots,
  realEstateDetails,
  users,
} from "@/db/schema";

/** Domain records are the persisted shapes; services never widen them. */
export type User = typeof users.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type RealEstateDetails = typeof realEstateDetails.$inferSelect;
export type NewRealEstateDetails = typeof realEstateDetails.$inferInsert;
export type Liability = typeof liabilities.$inferSelect;
export type NewLiability = typeof liabilities.$inferInsert;
export type IncomeSource = typeof incomeSources.$inferSelect;
export type NewIncomeSource = typeof incomeSources.$inferInsert;
export type PortfolioSnapshot = typeof portfolioSnapshots.$inferSelect;
export type OnboardingProgress = typeof onboardingProgress.$inferSelect;

export interface AssetWithDetails extends Asset {
  realEstate: RealEstateDetails | null;
}
