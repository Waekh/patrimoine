import { describe, expect, it } from "vitest";
import { mapAssetToWorldEntity, mapAssetsToWorldEntities } from "./wealth-to-world";

describe("mapAssetToWorldEntity", () => {
  it("maps a primary residence to a house with level from thresholds", () => {
    const e = mapAssetToWorldEntity({
      id: "a",
      name: "Maison",
      category: "REAL_ESTATE",
      valueCents: 40_000_000,
      currency: "EUR",
      propertyType: "PRIMARY_RESIDENCE",
    });
    expect(e.buildingType).toBe("HOUSE");
    expect(e.district).toBe("HOME_DISTRICT");
    expect(e.level).toBe(3);
    expect(e.spriteId).toBe("house_lv3");
    expect(e.footprint).toEqual({ w: 1, h: 1 });
    expect(e.nextLevelAtCents).toBe(50_000_000);
  });

  it("maps rental real estate to an apartment building", () => {
    const e = mapAssetToWorldEntity({
      id: "a",
      name: "T2",
      category: "REAL_ESTATE",
      valueCents: 12_000_000,
      currency: "EUR",
      propertyType: "RENTAL",
    });
    expect(e.buildingType).toBe("APARTMENT");
    expect(e.level).toBe(2);
  });

  it("maps every category through the config table", () => {
    expect(
      mapAssetToWorldEntity({ id: "1", name: "", category: "CASH", valueCents: 0, currency: "EUR" })
        .buildingType,
    ).toBe("BANK");
    expect(
      mapAssetToWorldEntity({ id: "2", name: "", category: "ETF", valueCents: 0, currency: "EUR" })
        .buildingType,
    ).toBe("FINANCIAL_BUILDING");
    expect(
      mapAssetToWorldEntity({ id: "3", name: "", category: "SCPI", valueCents: 0, currency: "EUR" })
        .district,
    ).toBe("REAL_ESTATE_DISTRICT");
    expect(
      mapAssetToWorldEntity({
        id: "4",
        name: "",
        category: "CRYPTO",
        valueCents: 0,
        currency: "EUR",
      }).buildingType,
    ).toBe("WAREHOUSE");
  });

  it("attaches linked liabilities and a debt ratio", () => {
    const e = mapAssetToWorldEntity(
      {
        id: "house",
        name: "Maison",
        category: "REAL_ESTATE",
        valueCents: 40_000_000,
        currency: "EUR",
        propertyType: "PRIMARY_RESIDENCE",
      },
      [
        { id: "l1", linkedAssetId: "house", remainingCents: 25_000_000 },
        { id: "l2", linkedAssetId: "other", remainingCents: 1 },
      ],
    );
    expect(e.linkedLiabilityIds).toEqual(["l1"]);
    expect(e.debtRatioBps).toBe(6250);
  });

  it("grows to a 2x2 footprint at level 4", () => {
    const e = mapAssetToWorldEntity({
      id: "b",
      name: "",
      category: "ETF",
      valueCents: 30_000_000,
      currency: "EUR",
    });
    expect(e.level).toBe(5);
    expect(e.footprint).toEqual({ w: 2, h: 2 });
  });

  it("maps lists in order", () => {
    const list = mapAssetsToWorldEntities([
      { id: "1", name: "", category: "CASH", valueCents: 0, currency: "EUR" },
      { id: "2", name: "", category: "ETF", valueCents: 0, currency: "EUR" },
    ]);
    expect(list.map((e) => e.assetId)).toEqual(["1", "2"]);
  });
});
