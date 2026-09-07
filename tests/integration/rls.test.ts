import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getAdminDb } from "@/db/client";
import { withUserDb } from "@/db/user-db";
import {
  deleteAsset,
  findAssetById,
  insertAsset,
  listAssets,
  updateAsset,
} from "@/db/queries/assets";
import { insertLiability, listLiabilities } from "@/db/queries/liabilities";
import { listSnapshots, upsertSnapshot } from "@/db/queries/snapshots";
import { findOnboardingProgress, saveOnboardingProgress } from "@/db/queries/onboarding";
import { ensureUserRecord } from "@/db/queries/users";

/**
 * SECURITY.md §2: user A can never read, modify or delete user B's data, even
 * through the application's own Drizzle queries. These tests run against a
 * real PostgreSQL with the RLS policies from the migrations.
 */
const userA = { id: randomUUID(), email: `a-${Date.now()}@test.local` };
const userB = { id: randomUUID(), email: `b-${Date.now()}@test.local` };
let assetOfB = "";

beforeAll(async () => {
  await withUserDb(userA.id, (tx) => ensureUserRecord(tx, userA));
  await withUserDb(userB.id, (tx) => ensureUserRecord(tx, userB));
  const created = await withUserDb(userB.id, (tx) =>
    insertAsset(tx, {
      userId: userB.id,
      category: "CASH",
      name: "B cash",
      currency: "EUR",
      currentValueCents: 200_000,
      manualValueCents: 200_000,
    }),
  );
  assetOfB = created.id;
  await withUserDb(userB.id, (tx) =>
    upsertSnapshot(tx, userB.id, "2026-01-01", {
      currency: "EUR",
      grossAssetsCents: 200_000,
      liabilitiesCents: 0,
      netWorthCents: 200_000,
    }),
  );
  await withUserDb(userB.id, (tx) => saveOnboardingProgress(tx, userB.id, 3, { secret: true }));
});

afterAll(async () => {
  const db = getAdminDb();
  await db.execute(sql`delete from users where id in (${userA.id}, ${userB.id})`);
});

describe("Row Level Security", () => {
  it("User A cannot access User B assets", async () => {
    const listed = await withUserDb(userA.id, (tx) => listAssets(tx, userA.id));
    expect(listed.map((a) => a.id)).not.toContain(assetOfB);
    const direct = await withUserDb(userA.id, (tx) => findAssetById(tx, userA.id, assetOfB));
    expect(direct).toBeNull();
    // Even a query that "forgets" the user_id filter is blocked by the policy.
    const raw = await withUserDb(userA.id, (tx) =>
      tx.execute<{ id: string }>(sql`select id from assets where id = ${assetOfB}`),
    );
    expect(raw.length).toBe(0);
  });

  it("User A cannot modify User B assets", async () => {
    const updated = await withUserDb(userA.id, (tx) =>
      updateAsset(tx, userA.id, assetOfB, { name: "hacked" }),
    );
    expect(updated).toBeNull();
    const rawUpdate = await withUserDb(userA.id, (tx) =>
      tx.execute(sql`update assets set name = 'hacked' where id = ${assetOfB}`),
    );
    expect(rawUpdate.count).toBe(0);
    const stillB = await withUserDb(userB.id, (tx) => findAssetById(tx, userB.id, assetOfB));
    expect(stillB?.name).toBe("B cash");
  });

  it("User A cannot delete User B assets", async () => {
    expect(await withUserDb(userA.id, (tx) => deleteAsset(tx, userA.id, assetOfB))).toBe(false);
    const rawDelete = await withUserDb(userA.id, (tx) =>
      tx.execute(sql`delete from assets where id = ${assetOfB}`),
    );
    expect(rawDelete.count).toBe(0);
    expect(
      await withUserDb(userB.id, (tx) => findAssetById(tx, userB.id, assetOfB)),
    ).not.toBeNull();
  });

  it("User A cannot forge rows for User B", async () => {
    // Drizzle wraps the PostgreSQL error ("new row violates row-level security policy") as the cause.
    await expect(
      withUserDb(userA.id, (tx) =>
        insertAsset(tx, {
          userId: userB.id,
          category: "CASH",
          name: "forged",
          currency: "EUR",
          currentValueCents: 1,
          manualValueCents: 1,
        }),
      ),
    ).rejects.toThrow();
    await expect(
      withUserDb(userA.id, (tx) =>
        insertLiability(tx, {
          userId: userB.id,
          type: "OTHER",
          name: "forged",
          currency: "EUR",
          initialAmountCents: 1,
          remainingAmountCents: 1,
        }),
      ),
    ).rejects.toThrow();
    const forged = await getAdminDb().execute<{ n: string }>(
      sql`select count(*)::text as n from assets where name = 'forged'`,
    );
    expect(forged[0]?.n).toBe("0");
    const forgedLiabilities = await getAdminDb().execute<{ n: string }>(
      sql`select count(*)::text as n from liabilities where name = 'forged'`,
    );
    expect(forgedLiabilities[0]?.n).toBe("0");
  });

  it("User A cannot access User B snapshots, liabilities or onboarding answers", async () => {
    expect(await withUserDb(userA.id, (tx) => listSnapshots(tx, userA.id))).toHaveLength(0);
    const rawSnapshots = await withUserDb(userA.id, (tx) =>
      tx.execute(sql`select id from portfolio_snapshots`),
    );
    expect(rawSnapshots.length).toBe(0);
    expect(await withUserDb(userA.id, (tx) => listLiabilities(tx, userA.id))).toHaveLength(0);
    expect(await withUserDb(userA.id, (tx) => findOnboardingProgress(tx, userB.id))).toBeNull();
    const rawProgress = await withUserDb(userA.id, (tx) =>
      tx.execute(sql`select answers from onboarding_progress`),
    );
    expect(rawProgress.length).toBe(0);
  });

  it("User B keeps full access to their own data", async () => {
    expect(await withUserDb(userB.id, (tx) => listAssets(tx, userB.id))).toHaveLength(1);
    expect(await withUserDb(userB.id, (tx) => listSnapshots(tx, userB.id))).toHaveLength(1);
    const progress = await withUserDb(userB.id, (tx) => findOnboardingProgress(tx, userB.id));
    expect(progress?.currentStep).toBe(3);
  });

  it("rejects malformed user identifiers before touching the database", async () => {
    await expect(withUserDb("not-a-uuid", async () => 1)).rejects.toThrow();
  });
});
