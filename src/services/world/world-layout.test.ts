import { describe, expect, it } from "vitest";
import { layoutWorld, validateLayout, zIndexOf } from "./world-layout";
import { mapAssetsToWorldEntities } from "./wealth-to-world";
import type { WorldEntity } from "@/types/world";

const entities = mapAssetsToWorldEntities([
  {
    id: "res",
    name: "Résidence",
    category: "REAL_ESTATE",
    valueCents: 40_000_000,
    currency: "EUR",
    propertyType: "PRIMARY_RESIDENCE",
  },
  { id: "etf", name: "ETF", category: "ETF", valueCents: 10_000_000, currency: "EUR" },
  { id: "cash", name: "Cash", category: "CASH", valueCents: 3_000_000, currency: "EUR" },
  { id: "scpi", name: "SCPI", category: "SCPI", valueCents: 8_000_000, currency: "EUR" },
  { id: "btc", name: "BTC", category: "CRYPTO", valueCents: 500_000, currency: "EUR" },
]);

describe("WorldLayoutEngine", () => {
  it("is deterministic for the same input and seed", () => {
    const a = layoutWorld(entities, { mapSize: 20, seed: 42, cityLevel: 3 });
    const b = layoutWorld(entities, { mapSize: 20, seed: 42, cityLevel: 3 });
    expect(a).toEqual(b);
    expect(a.buildings).toHaveLength(5);
    expect(a.unplaced).toHaveLength(0);
    expect(a.terrain).toHaveLength(400);
  });

  it("changes decorations with the seed but keeps buildings stable", () => {
    const a = layoutWorld(entities, { mapSize: 20, seed: 1, cityLevel: 3 });
    const b = layoutWorld(entities, { mapSize: 20, seed: 2, cityLevel: 3 });
    expect(a.buildings).toEqual(b.buildings);
    expect(a.decorations).not.toEqual(b.decorations);
  });

  it("places buildings inside their district and never on roads or water", () => {
    const r = layoutWorld(entities, { mapSize: 20, seed: 7, cityLevel: 3 });
    const blocked = new Set(
      r.terrain.filter((t) => t.kind !== "GRASS").map((t) => `${t.x}:${t.y}`),
    );
    for (const b of r.buildings) {
      const district = r.districts.find((d) => d.id === b.district);
      expect(district).toBeDefined();
      expect(b.position.x).toBeGreaterThanOrEqual(district!.x);
      expect(b.position.y).toBeGreaterThanOrEqual(district!.y);
      expect(b.position.x + b.footprint.w).toBeLessThanOrEqual(district!.x + district!.w);
      expect(b.position.y + b.footprint.h).toBeLessThanOrEqual(district!.y + district!.h);
      expect(blocked.has(`${b.position.x}:${b.position.y}`)).toBe(false);
    }
  });

  it("reports entities that cannot fit instead of overlapping", () => {
    const many: WorldEntity[] = Array.from({ length: 60 }, (_, i) => ({
      ...entities[1]!,
      assetId: `etf${i}`,
      level: 5,
      footprint: { w: 2, h: 2 },
    }));
    const r = layoutWorld(many, { mapSize: 20, seed: 1, cityLevel: 3 });
    expect(r.buildings.length + r.unplaced.length).toBe(60);
    expect(r.unplaced.length).toBeGreaterThan(0);
  });

  it("validateLayout throws on overlap", () => {
    const r = layoutWorld(entities, { mapSize: 20, seed: 3, cityLevel: 3 });
    const first = r.buildings[0]!;
    expect(() => validateLayout(20, [first, { ...first, id: "dup" }], [], r.terrain)).toThrow(
      /Chevauchement/,
    );
  });

  it("orders back to front", () => {
    expect(zIndexOf({ x: 0, y: 0 })).toBeLessThan(zIndexOf({ x: 1, y: 0 }));
    expect(zIndexOf({ x: 0, y: 1 })).toBeLessThan(zIndexOf({ x: 1, y: 1 }));
    expect(zIndexOf({ x: 2, y: 2 }, { w: 2, h: 2 })).toBeGreaterThan(zIndexOf({ x: 3, y: 2 }));
  });
});
