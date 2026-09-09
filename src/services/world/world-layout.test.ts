import { describe, expect, it } from "vitest";
import { layoutWorld, validateLayout, zIndexOf } from "./world-layout";
import { mapAssetsToWorldEntities } from "./wealth-to-world";
import type { WorldBuilding, WorldEntity } from "@/types/world";
import { headingBetween } from "@/config/sprites";

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

  it("packs the buildings of a district into one connected block", () => {
    // Same district, mixed footprints: they must end up as a quarter, not as
    // buildings scattered across the quadrant.
    const mixed = mapAssetsToWorldEntities([
      { id: "a", name: "A", category: "CASH", valueCents: 90_000_000, currency: "EUR" },
      { id: "b", name: "B", category: "SAVINGS", valueCents: 400_000, currency: "EUR" },
      { id: "c", name: "C", category: "SAVINGS", valueCents: 300_000, currency: "EUR" },
      { id: "d", name: "D", category: "SAVINGS", valueCents: 200_000, currency: "EUR" },
      { id: "e", name: "E", category: "CASH", valueCents: 100_000, currency: "EUR" },
    ]);
    const r = layoutWorld(mixed, { mapSize: 32, seed: 5, cityLevel: 4 });
    expect(r.unplaced).toHaveLength(0);
    const block = r.buildings.filter((b) => b.district === "CASH_DISTRICT");
    expect(block.length).toBe(5);

    /** Tiles between two footprints; 0 means they share an edge. */
    const gap = (a: WorldBuilding, b: WorldBuilding) => {
      const dx = Math.max(
        a.position.x - (b.position.x + b.footprint.w),
        b.position.x - (a.position.x + a.footprint.w),
      );
      const dy = Math.max(
        a.position.y - (b.position.y + b.footprint.h),
        b.position.y - (a.position.y + a.footprint.h),
      );
      return Math.max(dx, dy);
    };

    // At least one pair is attached: that is what "collé" means.
    const attached = block.some((a) => block.some((b) => a.id !== b.id && gap(a, b) === 0));
    expect(attached).toBe(true);

    // And the block holds together: every building is reachable from the first
    // through neighbours that either touch it or face it across the street.
    const seen = new Set([block[0]!.id]);
    for (let pass = 0; pass < block.length; pass += 1)
      for (const a of block)
        for (const b of block)
          if (seen.has(a.id) && !seen.has(b.id) && gap(a, b) <= 1) seen.add(b.id);
    expect(seen.size).toBe(block.length);
  });

  it("anchors a block with its largest asset", () => {
    const entitiesByValue = mapAssetsToWorldEntities([
      {
        id: "big",
        name: "Compte courant",
        category: "CASH",
        valueCents: 50_000_000,
        currency: "EUR",
      },
      { id: "small", name: "Livret A", category: "SAVINGS", valueCents: 500_000, currency: "EUR" },
    ]);
    const r = layoutWorld(entitiesByValue, { mapSize: 32, seed: 8, cityLevel: 3 });
    const big = r.buildings.find((b) => b.assetId === "big")!;
    const small = r.buildings.find((b) => b.assetId === "small")!;
    // Every district fills from the central crossroads, so the anchor of a
    // block ends up nearer the middle of the map than its satellites.
    const centre = 32 / 2;
    const toCentre = (b: WorldBuilding) =>
      Math.abs(b.position.x - centre) + Math.abs(b.position.y - centre);
    expect(toCentre(big)).toBeLessThan(toCentre(small));
  });

  it("gives the public garden a 2x2 square that nothing else overlaps", () => {
    const r = layoutWorld(entities, { mapSize: 32, seed: 11, cityLevel: 4 });
    const park = r.decorations.find((d) => d.kind === "PARK");
    expect(park).toBeDefined();
    expect(park!.footprint).toEqual({ w: 2, h: 2 });
    // validateLayout already claims every covered tile, so reaching here means
    // no building, tree or road shares any of the four cells.
    const covered = new Set<string>();
    for (let dy = 0; dy < 2; dy += 1)
      for (let dx = 0; dx < 2; dx += 1)
        covered.add(`${park!.position.x + dx}:${park!.position.y + dy}`);
    expect(covered.size).toBe(4);
    for (const other of r.decorations) {
      if (other.id === park!.id) continue;
      expect(covered.has(`${other.position.x}:${other.position.y}`)).toBe(false);
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

  it("fait circuler les voitures à droite, dans les quatre sens", () => {
    const road = 10;
    const { vehicles } = layoutWorld(entities, { mapSize: road * 2, seed: 7, cityLevel: 3 });
    const moving = vehicles.filter((v) => v.periodMs > 0);
    const headings = new Set(moving.map((v) => v.spriteId.split("_").at(-1)));
    expect(headings).toEqual(new Set(["north", "east", "south", "west"]));

    for (const car of moving) {
      const heading = headingBetween(car.from, car.to);
      expect(car.spriteId.endsWith(`_${heading}`), car.spriteId).toBe(true);
      // Right-hand traffic: each heading keeps the lane on its right.
      const lane = heading === "east" || heading === "west" ? car.from.y : car.from.x;
      const expectedLane = heading === "east" || heading === "north" ? road + 1 : road;
      expect(lane, `${car.id} ${heading}`).toBe(expectedLane);
    }
  });

  it("échelonne les voitures d'une même voie sur toute sa longueur", () => {
    const { vehicles } = layoutWorld(entities, { mapSize: 20, seed: 7, cityLevel: 3 });
    const lanes = new Map<string, number[]>();
    for (const car of vehicles.filter((v) => v.periodMs > 0)) {
      const heading = headingBetween(car.from, car.to);
      lanes.set(heading, [...(lanes.get(heading) ?? []), car.phaseMs / car.periodMs]);
    }
    expect(lanes.size).toBe(4);
    for (const [heading, laps] of lanes) {
      const sorted = [...laps].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i += 1)
        expect(sorted[i]! - sorted[i - 1]!, heading).toBeGreaterThanOrEqual(1 / sorted.length - 1e-9);
    }
  });

  it("gare les voitures hors des voies de circulation", () => {
    const road = 10;
    const { vehicles } = layoutWorld(entities, { mapSize: road * 2, seed: 7, cityLevel: 3 });
    const parked = vehicles.filter((v) => v.periodMs === 0);
    expect(parked.length).toBeGreaterThan(0);
    for (const car of parked) {
      const across = Number.isInteger(car.from.x) ? car.from.y : car.from.x;
      expect(Number.isInteger(across), car.id).toBe(false);
      // Clear of both lanes of the road it stands beside.
      expect(Math.min(Math.abs(across - road), Math.abs(across - (road + 1)))).toBeGreaterThan(0.5);
    }
  });

  it("borde chaque rue d'un trottoir, et n'y laisse rien construire", () => {
    const mapSize = 20;
    const { terrain, buildings, decorations } = layoutWorld(entities, {
      mapSize,
      seed: 3,
      cityLevel: 3,
    });
    const kind = new Map(terrain.map((t) => [`${t.x}:${t.y}`, t.kind]));
    const road = terrain.filter((t) => t.kind === "ROAD");
    expect(road.length).toBeGreaterThan(0);

    // Every tile touching the asphalt is either more asphalt or a pavement.
    for (const tile of road) {
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const neighbour = kind.get(`${tile.x + dx}:${tile.y + dy}`);
        if (!neighbour) continue;
        expect(["ROAD", "PAVEMENT"], `${tile.x + dx},${tile.y + dy}`).toContain(neighbour);
      }
    }

    const pavement = new Set(
      terrain.filter((t) => t.kind === "PAVEMENT").map((t) => `${t.x}:${t.y}`),
    );
    expect(pavement.size).toBeGreaterThan(0);
    for (const b of buildings)
      for (let dy = 0; dy < b.footprint.h; dy += 1)
        for (let dx = 0; dx < b.footprint.w; dx += 1)
          expect(pavement.has(`${b.position.x + dx}:${b.position.y + dy}`), b.id).toBe(false);

    // Lamps are the one thing that does stand on it.
    const lamps = decorations.filter((d) => d.kind === "LAMP");
    expect(lamps.length).toBeGreaterThan(0);
    for (const lamp of lamps)
      expect(pavement.has(`${lamp.position.x}:${lamp.position.y}`), lamp.id).toBe(true);
  });

  it("marque les abords du carrefour d'un passage piéton", () => {
    const mapSize = 20;
    const road = mapSize / 2;
    const { terrain } = layoutWorld(entities, { mapSize, seed: 3, cityLevel: 3 });
    const at = (x: number, y: number) => terrain.find((t) => t.x === x && t.y === y)!.spriteId;
    for (const along of [road, road + 1]) {
      // The four approaches, one tile out from the junction on each arm.
      expect(at(along, road - 1)).toContain("crossing");
      expect(at(along, road + 2)).toContain("crossing");
      expect(at(road - 1, along)).toContain("crossing");
      expect(at(road + 2, along)).toContain("crossing");
    }
    // The junction itself carries no markings: two sets of lines read as noise.
    expect(at(road, road)).not.toContain("crossing");
  });

  it("garde la circulation rare", () => {
    const { vehicles } = layoutWorld(entities, { mapSize: 20, seed: 3, cityLevel: 3 });
    expect(vehicles.length).toBeLessThanOrEqual(6);
  });

  it("orders back to front", () => {
    expect(zIndexOf({ x: 0, y: 0 })).toBeLessThan(zIndexOf({ x: 1, y: 0 }));
    expect(zIndexOf({ x: 0, y: 1 })).toBeLessThan(zIndexOf({ x: 1, y: 1 }));
    expect(zIndexOf({ x: 2, y: 2 }, { w: 2, h: 2 })).toBeGreaterThan(zIndexOf({ x: 3, y: 2 }));
  });
});
