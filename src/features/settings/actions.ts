"use server";

import { redirect } from "next/navigation";
import { withUserDb } from "@/db/user-db";
import { resetOnboarding } from "@/db/queries/onboarding";
import { requireUser } from "@/lib/auth";

/** Re-opens the questionnaire. Existing assets and liabilities are kept. */
export async function restartOnboardingAction(): Promise<void> {
  const user = await requireUser();
  await withUserDb(user.id, (tx) => resetOnboarding(tx, user.id));
  redirect("/onboarding");
}
