import "server-only";
import { withUserDb } from "@/db/user-db";
import { findOnboardingProgress } from "@/db/queries/onboarding";

export async function isOnboardingCompleted(userId: string): Promise<boolean> {
  const progress = await withUserDb(userId, (tx) => findOnboardingProgress(tx, userId));
  return Boolean(progress?.completedAt);
}
