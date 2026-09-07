import { and, asc, eq } from "drizzle-orm";
import { assets, liabilities, realEstateDetails } from "@/db/schema";
import type { UserTx } from "@/db/user-db";
import type {
  Asset,
  AssetWithDetails,
  NewAsset,
  NewRealEstateDetails,
  RealEstateDetails,
} from "@/types/domain";

/**
 * All queries take the RLS-scoped transaction AND filter by user_id
 * explicitly (defence in depth).
 */
export async function listAssets(tx: UserTx, userId: string): Promise<AssetWithDetails[]> {
  const rows = await tx
    .select({ asset: assets, realEstate: realEstateDetails })
    .from(assets)
    .leftJoin(realEstateDetails, eq(realEstateDetails.assetId, assets.id))
    .where(eq(assets.userId, userId))
    .orderBy(asc(assets.createdAt), asc(assets.id));
  return rows.map((r) => ({ ...r.asset, realEstate: r.realEstate }));
}

export async function findAssetById(
  tx: UserTx,
  userId: string,
  assetId: string,
): Promise<AssetWithDetails | null> {
  const rows = await tx
    .select({ asset: assets, realEstate: realEstateDetails })
    .from(assets)
    .leftJoin(realEstateDetails, eq(realEstateDetails.assetId, assets.id))
    .where(and(eq(assets.userId, userId), eq(assets.id, assetId)))
    .limit(1);
  const row = rows[0];
  return row ? { ...row.asset, realEstate: row.realEstate } : null;
}

export async function insertAsset(tx: UserTx, values: NewAsset): Promise<Asset> {
  const rows = await tx.insert(assets).values(values).returning();
  const row = rows[0];
  if (!row) throw new Error("Insertion de l'actif refusée.");
  return row;
}

export async function updateAsset(
  tx: UserTx,
  userId: string,
  assetId: string,
  values: Partial<NewAsset>,
): Promise<Asset | null> {
  const rows = await tx
    .update(assets)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(assets.userId, userId), eq(assets.id, assetId)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteAsset(tx: UserTx, userId: string, assetId: string): Promise<boolean> {
  const rows = await tx
    .delete(assets)
    .where(and(eq(assets.userId, userId), eq(assets.id, assetId)))
    .returning({ id: assets.id });
  return rows.length > 0;
}

export async function upsertRealEstateDetails(
  tx: UserTx,
  values: NewRealEstateDetails,
): Promise<RealEstateDetails> {
  const rows = await tx
    .insert(realEstateDetails)
    .values(values)
    .onConflictDoUpdate({
      target: realEstateDetails.assetId,
      set: {
        propertyType: values.propertyType,
        purchasePriceCents: values.purchasePriceCents ?? null,
        purchaseDate: values.purchaseDate ?? null,
        location: values.location ?? null,
        monthlyRentCents: values.monthlyRentCents ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();
  const row = rows[0];
  if (!row) throw new Error("Insertion des détails immobiliers refusée.");
  return row;
}

export async function deleteRealEstateDetails(
  tx: UserTx,
  userId: string,
  assetId: string,
): Promise<void> {
  await tx
    .delete(realEstateDetails)
    .where(and(eq(realEstateDetails.userId, userId), eq(realEstateDetails.assetId, assetId)));
}

/** Detaches liabilities that pointed at a deleted asset (never leaves an orphan reference). */
export async function unlinkLiabilitiesFromAsset(
  tx: UserTx,
  userId: string,
  assetId: string,
): Promise<void> {
  await tx
    .update(liabilities)
    .set({ linkedAssetId: null, updatedAt: new Date() })
    .where(and(eq(liabilities.userId, userId), eq(liabilities.linkedAssetId, assetId)));
}
