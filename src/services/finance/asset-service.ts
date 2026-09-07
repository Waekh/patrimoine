import "server-only";
import { withUserDb } from "@/db/user-db";
import {
  deleteAsset as deleteAssetRow,
  deleteRealEstateDetails,
  findAssetById,
  insertAsset,
  unlinkLiabilitiesFromAsset,
  updateAsset as updateAssetRow,
  upsertRealEstateDetails,
} from "@/db/queries/assets";
import { logger } from "@/lib/logger";
import { appError, err, ok, type Result } from "@/lib/result";
import type { AssetInput } from "@/lib/validation/assets";
import { getMarketDataService } from "@/services/market-data/market-data-service";
import { valueAsset } from "@/services/valuation/valuation-service";
import type { Asset, AssetWithDetails, NewAsset } from "@/types/domain";
import { recalculateAndSnapshot } from "./wealth-overview";

async function toAssetValues(userId: string, input: AssetInput): Promise<Omit<NewAsset, "id">> {
  const valuation = await valueAsset(
    {
      valuationType: input.valuationType,
      currency: input.currency,
      manualValueCents: input.manualValueCents,
      quantity: input.quantity ?? null,
      ticker: input.ticker ?? null,
    },
    getMarketDataService(),
  );
  // When a market value is unavailable we keep the user's manual figure and
  // record no valuation timestamp: the UI shows "Donnée indisponible".
  const currentValueCents =
    valuation.status === "MARKET" ? valuation.currentValueCents : input.manualValueCents;
  return {
    userId,
    category: input.category,
    subcategory: input.subcategory ?? null,
    name: input.name,
    description: input.description ?? null,
    currency: input.currency,
    currentValueCents,
    purchaseValueCents: input.purchaseValueCents ?? null,
    quantity: input.quantity ? input.quantity.replace(",", ".") : null,
    unitPriceCents: valuation.status === "MARKET" ? valuation.unitPriceCents : null,
    ticker: input.ticker ?? null,
    provider: valuation.status === "MARKET" ? valuation.quote.provider : null,
    valuationType: input.valuationType,
    manualValueCents: input.manualValueCents,
    valuedAt: valuation.status === "MARKET" ? valuation.valuedAt : null,
    isActive: true,
  };
}

/** AssetService: create / update / delete with recalculation and snapshot in one transaction. */
export async function createAsset(userId: string, input: AssetInput): Promise<Result<Asset>> {
  try {
    const values = await toAssetValues(userId, input);
    const asset = await withUserDb(userId, async (tx) => {
      const created = await insertAsset(tx, values);
      if (input.category === "REAL_ESTATE" && input.realEstate) {
        await upsertRealEstateDetails(tx, { assetId: created.id, userId, ...input.realEstate });
      }
      await recalculateAndSnapshot(tx, userId);
      return created;
    });
    return ok(asset);
  } catch (error) {
    logger.error("asset.create.failed", error, { userId });
    return err(appError("INTERNAL", "Une erreur est survenue. Veuillez réessayer."));
  }
}

export async function updateAsset(
  userId: string,
  assetId: string,
  input: AssetInput,
): Promise<Result<Asset>> {
  try {
    const values = await toAssetValues(userId, input);
    const result = await withUserDb(userId, async (tx) => {
      const existing = await findAssetById(tx, userId, assetId);
      if (!existing) return null;
      const updated = await updateAssetRow(tx, userId, assetId, values);
      if (!updated) return null;
      if (input.category === "REAL_ESTATE" && input.realEstate) {
        await upsertRealEstateDetails(tx, { assetId, userId, ...input.realEstate });
      } else if (existing.realEstate) {
        await deleteRealEstateDetails(tx, userId, assetId);
      }
      await recalculateAndSnapshot(tx, userId);
      return updated;
    });
    if (!result) return err(appError("NOT_FOUND", "Actif introuvable."));
    return ok(result);
  } catch (error) {
    logger.error("asset.update.failed", error, { userId });
    return err(appError("INTERNAL", "Une erreur est survenue. Veuillez réessayer."));
  }
}

export async function deleteAsset(userId: string, assetId: string): Promise<Result<void>> {
  try {
    const deleted = await withUserDb(userId, async (tx) => {
      await unlinkLiabilitiesFromAsset(tx, userId, assetId);
      const removed = await deleteAssetRow(tx, userId, assetId);
      if (removed) await recalculateAndSnapshot(tx, userId);
      return removed;
    });
    if (!deleted) return err(appError("NOT_FOUND", "Actif introuvable."));
    return ok(undefined);
  } catch (error) {
    logger.error("asset.delete.failed", error, { userId });
    return err(appError("INTERNAL", "Une erreur est survenue. Veuillez réessayer."));
  }
}

export async function getAsset(userId: string, assetId: string): Promise<AssetWithDetails | null> {
  return withUserDb(userId, (tx) => findAssetById(tx, userId, assetId));
}
