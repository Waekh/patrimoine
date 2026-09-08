import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { getAdminDb } from "@/db/client";
import { withUserDb } from "@/db/user-db";
import { findOnboardingProgress, saveOnboardingProgress } from "@/db/queries/onboarding";
import { requireProvisionedUser } from "@/services/auth/user-provisioning";

const created: string[] = [];

function newUser() {
  const user = { id: randomUUID(), email: `prov-${Date.now()}-${created.length}@test.local` };
  created.push(user.id);
  return user;
}

afterEach(async () => {
  for (const id of created.splice(0)) {
    await getAdminDb().execute(sql`delete from users where id = ${id}`);
  }
});

describe("user provisioning", () => {
  it("refuses to save onboarding progress for a session with no application row", async () => {
    // The exact shape of the bug: Supabase authenticates the visitor, but no
    // row exists in public.users, so every write fails on the foreign key.
    const user = newUser();
    await expect(
      withUserDb(user.id, (tx) => saveOnboardingProgress(tx, user.id, 1, { situation: {} })),
    ).rejects.toThrow();
  });

  it("provisions the row so the questionnaire can then be saved", async () => {
    const user = newUser();
    await requireProvisionedUser(user);
    const saved = await withUserDb(user.id, (tx) =>
      saveOnboardingProgress(tx, user.id, 1, { situation: { hasBankAccounts: true } }),
    );
    expect(saved.userId).toBe(user.id);

    const read = await withUserDb(user.id, (tx) => findOnboardingProgress(tx, user.id));
    expect(read?.currentStep).toBe(1);
  });

  it("is idempotent and refreshes the e-mail on the way", async () => {
    const user = newUser();
    await requireProvisionedUser(user);
    await requireProvisionedUser({ ...user, email: `renamed-${user.email}` });
    const rows = await getAdminDb().execute(sql`select email from users where id = ${user.id}`);
    expect(rows).toHaveLength(1);
    expect((rows[0] as { email: string }).email).toBe(`renamed-${user.email}`);
  });
});
