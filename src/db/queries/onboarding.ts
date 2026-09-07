import { eq } from "drizzle-orm";
import { onboardingProgress } from "@/db/schema";
import type { UserTx } from "@/db/user-db";
import type { OnboardingProgress } from "@/types/domain";

export async function findOnboardingProgress(
  tx: UserTx,
  userId: string,
): Promise<OnboardingProgress | null> {
  const rows = await tx
    .select()
    .from(onboardingProgress)
    .where(eq(onboardingProgress.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function saveOnboardingProgress(
  tx: UserTx,
  userId: string,
  currentStep: number,
  answers: unknown,
): Promise<OnboardingProgress> {
  const rows = await tx
    .insert(onboardingProgress)
    .values({ userId, currentStep, answers })
    .onConflictDoUpdate({
      target: onboardingProgress.userId,
      set: { currentStep, answers, updatedAt: new Date() },
    })
    .returning();
  const row = rows[0];
  if (!row) throw new Error("Sauvegarde de l'onboarding refusée.");
  return row;
}

export async function markOnboardingCompleted(tx: UserTx, userId: string): Promise<void> {
  await tx
    .insert(onboardingProgress)
    .values({ userId, currentStep: 0, answers: {}, completedAt: new Date() })
    .onConflictDoUpdate({
      target: onboardingProgress.userId,
      set: { completedAt: new Date(), updatedAt: new Date() },
    });
}

export async function resetOnboarding(tx: UserTx, userId: string): Promise<void> {
  await tx
    .update(onboardingProgress)
    .set({ completedAt: null, currentStep: 0, answers: {}, updatedAt: new Date() })
    .where(eq(onboardingProgress.userId, userId));
}
