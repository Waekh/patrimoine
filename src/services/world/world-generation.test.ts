import { describe, expect, it } from "vitest";
import { calculateWealthSummary } from "@/services/finance/wealth-calculation";
import { generateWorldState } from "./world-generation";
import { mapAssetsToWorldEntities } from "./wealth-to-world";

describe("generateWorldState", () => {
  it("produces the same world for the same data and an empty world for no data", () => {
    const summary = calculateWealthSummary(
      [
        {
          id: "res",
          category: "REAL_ESTATE",
          currency: "EUR",
          currentValueCents: 40_000_000,
          isActive: true,
        },
      ],
      [{ id: "l", currency: "EUR", remainingAmountCents: 25_000_000, linkedAssetId: "res" }],
    );
    const entities = mapAssetsToWorldEntities(
      [
        {
          id: "res",
          name: "Maison",
          category: "REAL_ESTATE",
          valueCents: 40_000_000,
          currency: "EUR",
          propertyType: "PRIMARY_RESIDENCE",
        },
      ],
      [{ id: "l", linkedAssetId: "res", remainingCents: 25_000_000 }],
    );
    const a = generateWorldState({ worldKey: "user-1", summary, entities, usesPlaceholders: true });
    const b = generateWorldState({ worldKey: "user-1", summary, entities, usesPlaceholders: true });
    expect(a).toEqual(b);
    expect(a.resources.worldLevel).toBe("TOWN");
    expect(a.buildings[0]?.linkedLiabilityIds).toEqual(["l"]);

    const empty = generateWorldState({
      worldKey: "user-2",
      summary: calculateWealthSummary([], []),
      entities: [],
      usesPlaceholders: true,
    });
    expect(empty.buildings).toHaveLength(0);
    expect(empty.mapSize).toBe(20);
    expect(empty.terrain.length).toBe(400);
    expect(empty.resources.worldLevel).toBe("HAMLET");
  });
});
