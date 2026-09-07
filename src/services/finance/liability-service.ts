import "server-only";
import { withUserDb } from "@/db/user-db";
import { findAssetById } from "@/db/queries/assets";
import {
  deleteLiability as deleteLiabilityRow,
  findLiabilityById,
  insertLiability,
  updateLiability as updateLiabilityRow,
} from "@/db/queries/liabilities";
import { logger } from "@/lib/logger";
import { appError, err, ok, type Result } from "@/lib/result";
import type { LiabilityInput } from "@/lib/validation/liabilities";
import type { Liability, NewLiability } from "@/types/domain";
import { recalculateAndSnapshot } from "./wealth-overview";

function toValues(userId: string, input: LiabilityInput): Omit<NewLiability, "id"> {
  return {
    userId,
    type: input.type,
    name: input.name,
    currency: input.currency,
    initialAmountCents: input.initialAmountCents,
    remainingAmountCents: input.remainingAmountCents,
    interestRateBps: input.interestRateBps ?? null,
    monthlyPaymentCents: input.monthlyPaymentCents ?? null,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    linkedAssetId: input.linkedAssetId ?? null,
  };
}

/** LiabilityService. A linked asset must belong to the same user (checked inside RLS). */
export async function createLiability(
  userId: string,
  input: LiabilityInput,
): Promise<Result<Liability>> {
  try {
    const result = await withUserDb(userId, async (tx) => {
      if (input.linkedAssetId && !(await findAssetById(tx, userId, input.linkedAssetId)))
        return "ASSET_NOT_FOUND" as const;
      const created = await insertLiability(tx, toValues(userId, input));
      await recalculateAndSnapshot(tx, userId);
      return created;
    });
    if (result === "ASSET_NOT_FOUND")
      return err(
        appError("VALIDATION", "Actif lié introuvable.", { linkedAssetId: ["Actif introuvable."] }),
      );
    return ok(result);
  } catch (error) {
    logger.error("liability.create.failed", error, { userId });
    return err(appError("INTERNAL", "Une erreur est survenue. Veuillez réessayer."));
  }
}

export async function updateLiability(
  userId: string,
  id: string,
  input: LiabilityInput,
): Promise<Result<Liability>> {
  try {
    const result = await withUserDb(userId, async (tx) => {
      if (input.linkedAssetId && !(await findAssetById(tx, userId, input.linkedAssetId)))
        return "ASSET_NOT_FOUND" as const;
      const updated = await updateLiabilityRow(tx, userId, id, toValues(userId, input));
      if (!updated) return null;
      await recalculateAndSnapshot(tx, userId);
      return updated;
    });
    if (result === "ASSET_NOT_FOUND")
      return err(
        appError("VALIDATION", "Actif lié introuvable.", { linkedAssetId: ["Actif introuvable."] }),
      );
    if (!result) return err(appError("NOT_FOUND", "Dette introuvable."));
    return ok(result);
  } catch (error) {
    logger.error("liability.update.failed", error, { userId });
    return err(appError("INTERNAL", "Une erreur est survenue. Veuillez réessayer."));
  }
}

export async function deleteLiability(userId: string, id: string): Promise<Result<void>> {
  try {
    const removed = await withUserDb(userId, async (tx) => {
      const ok = await deleteLiabilityRow(tx, userId, id);
      if (ok) await recalculateAndSnapshot(tx, userId);
      return ok;
    });
    if (!removed) return err(appError("NOT_FOUND", "Dette introuvable."));
    return ok(undefined);
  } catch (error) {
    logger.error("liability.delete.failed", error, { userId });
    return err(appError("INTERNAL", "Une erreur est survenue. Veuillez réessayer."));
  }
}

export async function getLiability(userId: string, id: string): Promise<Liability | null> {
  return withUserDb(userId, (tx) => findLiabilityById(tx, userId, id));
}
