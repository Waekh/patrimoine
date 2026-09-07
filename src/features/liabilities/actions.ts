"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { fieldErrorsFromZod, uuidSchema } from "@/lib/validation/common";
import { liabilityInputSchema } from "@/lib/validation/liabilities";
import { formDataToObject } from "@/lib/validation/form-data";
import {
  createLiability,
  deleteLiability,
  updateLiability,
} from "@/services/finance/liability-service";
import { formStateFromError, type FormState } from "@/features/shared/form-state";

const WEALTH_PATHS = ["/world", "/patrimoine", "/assets", "/liabilities", "/history"] as const;

function revalidateWealth(): void {
  for (const path of WEALTH_PATHS) revalidatePath(path);
}

export async function createLiabilityAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = liabilityInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  const result = await createLiability(user.id, parsed.data);
  if (!result.ok) return formStateFromError(result.error);
  revalidateWealth();
  redirect(`/liabilities?created=${result.value.id}`);
}

export async function updateLiabilityAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const id = uuidSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Dette introuvable." };
  const parsed = liabilityInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  const result = await updateLiability(user.id, id.data, parsed.data);
  if (!result.ok) return formStateFromError(result.error);
  revalidateWealth();
  redirect(`/liabilities?updated=${result.value.id}`);
}

export async function deleteLiabilityAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = uuidSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  await deleteLiability(user.id, id.data);
  revalidateWealth();
  redirect("/liabilities?deleted=1");
}
