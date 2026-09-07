"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { fieldErrorsFromZod, uuidSchema } from "@/lib/validation/common";
import { assetInputSchema } from "@/lib/validation/assets";
import { formDataToObject, nestKeys } from "@/lib/validation/form-data";
import { createAsset, deleteAsset, updateAsset } from "@/services/finance/asset-service";
import { formStateFromError, type FormState } from "@/features/shared/form-state";

const WEALTH_PATHS = ["/world", "/patrimoine", "/assets", "/liabilities", "/history"] as const;

function revalidateWealth(): void {
  for (const path of WEALTH_PATHS) revalidatePath(path);
}

function parseAssetForm(formData: FormData) {
  const raw = nestKeys(formDataToObject(formData));
  if (raw.category !== "REAL_ESTATE") raw.realEstate = null;
  return assetInputSchema.safeParse(raw);
}

export async function createAssetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseAssetForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  const result = await createAsset(user.id, parsed.data);
  if (!result.ok) return formStateFromError(result.error);
  revalidateWealth();
  redirect(`/assets?created=${result.value.id}`);
}

export async function updateAssetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = uuidSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Actif introuvable." };
  const parsed = parseAssetForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  const result = await updateAsset(user.id, id.data, parsed.data);
  if (!result.ok) return formStateFromError(result.error);
  revalidateWealth();
  redirect(`/assets?updated=${result.value.id}`);
}

export async function deleteAssetAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = uuidSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  await deleteAsset(user.id, id.data);
  revalidateWealth();
  redirect("/assets?deleted=1");
}
