import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getAdminDb } from "@/db/client";
import { withUserDb } from "@/db/user-db";
import { ensureUserRecord } from "@/db/queries/users";
import { listSnapshots } from "@/db/queries/snapshots";
import { createAsset, deleteAsset, updateAsset } from "@/services/finance/asset-service";
import { createLiability } from "@/services/finance/liability-service";
import { getWealthOverview } from "@/services/finance/wealth-overview";

const user = { id: randomUUID(), email: `svc-${Date.now()}@test.local` };

beforeAll(async () => {
  await withUserDb(user.id, (tx) => ensureUserRecord(tx, user));
});

afterAll(async () => {
  await getAdminDb().execute(sql`delete from users where id = ${user.id}`);
});

describe("AssetService / LiabilityService", () => {
  it("creates an asset, recalculates net worth, snapshots, updates the world, then deletes without orphans", async () => {
    const created = await createAsset(user.id, {
      category: "REAL_ESTATE",
      name: "Maison",
      currency: "EUR",
      manualValueCents: 40_000_000,
      valuationType: "MANUAL",
      realEstate: { propertyType: "PRIMARY_RESIDENCE" },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const liability = await createLiability(user.id, {
      type: "MORTGAGE",
      name: "Crédit",
      currency: "EUR",
      initialAmountCents: 30_000_000,
      remainingAmountCents: 25_000_000,
      linkedAssetId: created.value.id,
    });
    expect(liability.ok).toBe(true);

    let overview = await getWealthOverview(user.id);
    expect(overview.summary.netWorth.amountCents).toBe(15_000_000);
    expect(overview.world.buildings).toHaveLength(1);
    expect(overview.world.buildings[0]?.type).toBe("HOUSE");
    expect(overview.world.buildings[0]?.level).toBe(3);
    expect(overview.world.buildings[0]?.linkedLiabilityIds).toHaveLength(1);
    expect(overview.world.resources.worldLevel).toBe("TOWN");

    const updated = await updateAsset(user.id, created.value.id, {
      category: "REAL_ESTATE",
      name: "Maison",
      currency: "EUR",
      manualValueCents: 60_000_000,
      valuationType: "MANUAL",
      realEstate: { propertyType: "PRIMARY_RESIDENCE" },
    });
    expect(updated.ok).toBe(true);
    overview = await getWealthOverview(user.id);
    expect(overview.world.buildings[0]?.level).toBe(4);
    expect(overview.summary.netWorth.amountCents).toBe(35_000_000);

    const snapshots = await withUserDb(user.id, (tx) => listSnapshots(tx, user.id));
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.netWorthCents).toBe(35_000_000);

    const deleted = await deleteAsset(user.id, created.value.id);
    expect(deleted.ok).toBe(true);
    overview = await getWealthOverview(user.id);
    expect(overview.world.buildings).toHaveLength(0);
    expect(overview.liabilities[0]?.linkedAssetId).toBeNull();
    expect(overview.summary.netWorth.amountCents).toBe(-25_000_000);
  });

  it("refuses to link a liability to an asset the user does not own", async () => {
    const result = await createLiability(user.id, {
      type: "OTHER",
      name: "x",
      currency: "EUR",
      initialAmountCents: 1,
      remainingAmountCents: 1,
      linkedAssetId: randomUUID(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION");
  });

  it("keeps the manual value and marks the market value unavailable for an unknown ticker", async () => {
    const result = await createAsset(user.id, {
      category: "ETF",
      name: "Inconnu",
      currency: "EUR",
      manualValueCents: 1_000,
      valuationType: "MARKET",
      ticker: "NOPE",
      quantity: "1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.currentValueCents).toBe(1_000);
    expect(result.value.valuedAt).toBeNull();

    const known = await createAsset(user.id, {
      category: "ETF",
      name: "CW8",
      currency: "EUR",
      manualValueCents: 0,
      valuationType: "MARKET",
      ticker: "CW8",
      quantity: "10",
    });
    expect(known.ok).toBe(true);
    if (!known.ok) return;
    expect(known.value.currentValueCents).toBe(524_120);
    expect(known.value.provider).toBe("mock");
  });
});
