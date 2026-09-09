import { DISTRICT_IDS, type DistrictId } from "@/config/districts";
import {
  CAR_COLOURS,
  PARK_FOOTPRINT,
  SPRITE_IDS,
  carSpriteId,
  headingBetween,
  type CarHeading,
} from "@/config/sprites";
import type {
  DistrictArea,
  Footprint,
  GridPosition,
  WorldBuilding,
  WorldCharacter,
  WorldDecoration,
  WorldEntity,
  WorldFish,
  WorldTerrainTile,
  WorldVehicle,
} from "@/types/world";
import { createSeededRandom } from "./seeded-random";

export interface LayoutResult {
  terrain: WorldTerrainTile[];
  buildings: WorldBuilding[];
  decorations: WorldDecoration[];
  fish: WorldFish[];
  vehicles: WorldVehicle[];
  characters: WorldCharacter[];
  districts: DistrictArea[];
  /** Entities that did not fit in their district (world too small). */
  unplaced: WorldEntity[];
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  /**
   * Corner the district fills from. Every district starts against the central
   * crossroads, so the city grows outwards from the middle of the map instead
   * of hugging its edges.
   */
  anchorX: "start" | "end";
  anchorY: "start" | "end";
}

/** Occupancy grid used for collision detection. */
class Occupancy {
  private readonly cells: Uint8Array;
  constructor(readonly size: number) {
    this.cells = new Uint8Array(size * size);
  }
  isFree(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return false;
    return this.cells[y * this.size + x] === 0;
  }
  areaFree(x: number, y: number, w: number, h: number): boolean {
    for (let dy = 0; dy < h; dy += 1)
      for (let dx = 0; dx < w; dx += 1) if (!this.isFree(x + dx, y + dy)) return false;
    return true;
  }
  occupy(x: number, y: number, w: number, h: number): void {
    for (let dy = 0; dy < h; dy += 1)
      for (let dx = 0; dx < w; dx += 1) this.cells[(y + dy) * this.size + x + dx] = 1;
  }
}

/**
 * Districts are the four quadrants around a central road cross; the
 * alternative district takes the lower half of the south-east quadrant.
 */
export function computeDistrictRects(mapSize: number): Record<DistrictId, Rect> {
  const road = Math.floor(mapSize / 2);
  const q = road - 1; // usable width of a quadrant, one tile margin from the roads
  const east = road + 2;
  const seSplit = Math.floor(q / 2);
  return {
    HOME_DISTRICT: { x: 1, y: 1, w: q, h: q, anchorX: "end", anchorY: "end" },
    FINANCE_DISTRICT: {
      x: east,
      y: 1,
      w: mapSize - east - 1,
      h: q,
      anchorX: "start",
      anchorY: "end",
    },
    CASH_DISTRICT: { x: 1, y: east, w: q, h: mapSize - east - 1, anchorX: "end", anchorY: "start" },
    REAL_ESTATE_DISTRICT: {
      x: east,
      y: east,
      w: mapSize - east - 1,
      h: seSplit,
      anchorX: "start",
      anchorY: "start",
    },
    ALTERNATIVE_DISTRICT: {
      x: east,
      y: east + seSplit + 1,
      w: mapSize - east - 1,
      h: mapSize - east - seSplit - 2,
      anchorX: "start",
      anchorY: "start",
    },
  };
}

function buildTerrain(mapSize: number, occupancy: Occupancy): WorldTerrainTile[] {
  const road = Math.floor(mapSize / 2);
  const tiles: WorldTerrainTile[] = [];
  // Small pond in the south-west corner: purely decorative, never buildable.
  const pond = { x: 1, y: mapSize - 4, w: 3, h: 3 };
  for (let y = 0; y < mapSize; y += 1) {
    for (let x = 0; x < mapSize; x += 1) {
      const onRoadX = x === road || x === road + 1;
      const onRoadY = y === road || y === road + 1;
      if (onRoadX || onRoadY) {
        const spriteId =
          onRoadX && onRoadY
            ? SPRITE_IDS.roadCross
            : onRoadX
              ? SPRITE_IDS.roadNS
              : SPRITE_IDS.roadEW;
        tiles.push({ x, y, kind: "ROAD", spriteId });
        occupancy.occupy(x, y, 1, 1);
      } else if (x >= pond.x && x < pond.x + pond.w && y >= pond.y && y < pond.y + pond.h) {
        tiles.push({ x, y, kind: "WATER", spriteId: SPRITE_IDS.terrainWater });
        occupancy.occupy(x, y, 1, 1);
      } else {
        tiles.push({ x, y, kind: "GRASS", spriteId: SPRITE_IDS.terrainGrass });
      }
    }
  }
  return tiles;
}

/** Largest footprint a building can take, in tiles. */
const MAX_BUILDING_SIZE = 2;
/** One slot: the largest footprint plus the street tile that follows it. */
const SLOT_STRIDE = MAX_BUILDING_SIZE + 1;

/**
 * Tiles of street frontage a block takes before wrapping to the next row. Six
 * holds three large buildings side by side, which keeps a district compact
 * instead of stringing it into a line across the whole quadrant.
 */
const BLOCK_FRONTAGE = 6;

/**
 * Coordinate of a building along the street, from its offset in the terrace.
 * Buildings in a row are attached, so the offset is a running total of the
 * widths already placed, not a slot on a spaced grid.
 *
 * `anchor` says which end of the district faces the central crossroads: a block
 * always grows away from it, and the building's inner edge is what lines up.
 */
function frontagePosition(
  start: number,
  length: number,
  offset: number,
  size: number,
  anchor: "start" | "end",
): number {
  return anchor === "start" ? start + offset : start + length - size - offset;
}

/**
 * Coordinate across the street, from the row index. Rows are spaced by the
 * largest footprint plus a street, and it is the *front* edge of every building
 * that lines up, so a 1x1 and a 2x2 in the same row share one pavement.
 */
function rowPosition(
  start: number,
  length: number,
  row: number,
  size: number,
  anchor: "start" | "end",
): number {
  const depth = row * SLOT_STRIDE;
  return anchor === "start" ? start + depth : start + length - size - depth;
}

/**
 * Buildings are placed by value, largest first, and packed into a terrace
 * inside their district: neighbours are attached along the street, rows are
 * separated by one, and the block grows away from the central crossroads. The
 * largest asset of a family therefore anchors the corner of its block and the
 * smaller ones line up beside it, which is what makes a district read as a
 * quarter rather than as scattered buildings.
 *
 * A consequence worth knowing: because neighbours are attached, a building that
 * grows to a 2x2 footprint shifts the ones after it in its row.
 */
function placeEntities(
  entities: readonly WorldEntity[],
  rects: Record<DistrictId, Rect>,
  occupancy: Occupancy,
) {
  const buildings: WorldBuilding[] = [];
  const unplaced: WorldEntity[] = [];
  const counts: Record<DistrictId, number> = {
    HOME_DISTRICT: 0,
    FINANCE_DISTRICT: 0,
    REAL_ESTATE_DISTRICT: 0,
    CASH_DISTRICT: 0,
    ALTERNATIVE_DISTRICT: 0,
  };
  /** Where the next building of each district goes: row, then offset in it. */
  const cursors: Record<string, { row: number; offset: number }> = {};
  const sorted = [...entities].sort(
    (a, b) => b.valueCents - a.valueCents || a.assetId.localeCompare(b.assetId),
  );
  for (const entity of sorted) {
    const rect = rects[entity.district];
    const { w, h } = entity.footprint;
    const cursor = (cursors[entity.district] ??= { row: 0, offset: 0 });
    let placed: GridPosition | null = null;
    // Walk the terrace: try the current spot, then the next one along the row,
    // then the next row. The occupancy check still has the last word, because
    // roads, water and a neighbour's footprint can all block a slot.
    for (let attempt = 0; attempt < 64 && !placed; attempt += 1) {
      const wrapped = cursor.offset + w > BLOCK_FRONTAGE;
      if (wrapped) {
        cursor.row += 1;
        cursor.offset = 0;
      }
      const x = frontagePosition(rect.x, rect.w, cursor.offset, w, rect.anchorX);
      const y = rowPosition(rect.y, rect.h, cursor.row, h, rect.anchorY);
      const insideX = x >= rect.x && x + w <= rect.x + rect.w;
      const insideY = y >= rect.y && y + h <= rect.y + rect.h;
      if (insideX && insideY && occupancy.areaFree(x, y, w, h)) {
        placed = { x, y };
        cursor.offset += w;
        break;
      }
      // Blocked: step along the row, and let the next turn wrap if needed.
      cursor.offset += insideY ? 1 : BLOCK_FRONTAGE;
      if (!insideY && cursor.row * SLOT_STRIDE > rect.h) break;
    }
    if (!placed) {
      unplaced.push(entity);
      continue;
    }
    occupancy.occupy(placed.x, placed.y, w, h);
    counts[entity.district] += 1;
    buildings.push({
      id: `building_${entity.assetId}`,
      type: entity.buildingType,
      level: entity.level,
      position: placed,
      footprint: entity.footprint,
      spriteId: entity.spriteId,
      district: entity.district,
      assetId: entity.assetId,
      assetCategory: entity.assetCategory,
      label: entity.label,
      valueCents: entity.valueCents,
      currency: entity.currency,
      linkedLiabilityIds: entity.linkedLiabilityIds,
      debtRatioBps: entity.debtRatioBps,
      nextLevelAtCents: entity.nextLevelAtCents,
    });
  }
  return { buildings, unplaced, counts };
}

/**
 * Keeps the three tiles in front of a building clear. That is where the sign
 * stands, and a tree planted there sorts in front of it and hides the label.
 */
function reserveSignClearance(buildings: readonly WorldBuilding[], occupancy: Occupancy): void {
  for (const building of buildings) {
    const fx = building.position.x + building.footprint.w - 1;
    const fy = building.position.y + building.footprint.h - 1;
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [1, 1],
    ] as const)
      if (occupancy.isFree(fx + dx, fy + dy)) occupancy.occupy(fx + dx, fy + dy, 1, 1);
  }
}

function placeDecorations(
  mapSize: number,
  rects: Record<DistrictId, Rect>,
  occupancy: Occupancy,
  random: () => number,
  cityLevel: number,
) {
  const decorations: WorldDecoration[] = [];
  const fish: WorldFish[] = [];
  // Ponds first: they need room, and they break up the large empty lawns that
  // otherwise fill a map whose owner holds only a handful of assets.
  for (const pond of pondPositions(mapSize, occupancy, random)) {
    decorations.push({
      id: `pond_${pond.x}_${pond.y}`,
      kind: "POND",
      position: pond,
      spriteId: SPRITE_IDS.pond,
      footprint: { w: 1, h: 1 },
    });
    occupancy.occupy(pond.x, pond.y, 1, 1);
    const shoal = 1 + Math.floor(random() * 2);
    for (let k = 0; k < shoal; k += 1) {
      // Offsets stay well inside the tile so a fish never swims onto the bank.
      const from = { x: -0.22 - random() * 0.1, y: -0.1 + random() * 0.2 };
      fish.push({
        id: `fish_${pond.x}_${pond.y}_${k}`,
        position: pond,
        spriteId: SPRITE_IDS.fish,
        from,
        to: { x: -from.x, y: -from.y },
        periodMs: 2600 + Math.floor(random() * 2200),
      });
    }
  }
  const density = 0.12 + Math.min(0.2, cityLevel * 0.02);
  for (let y = 0; y < mapSize; y += 1) {
    for (let x = 0; x < mapSize; x += 1) {
      if (!occupancy.isFree(x, y)) continue;
      const r = random();
      const border = x === 0 || y === 0 || x === mapSize - 1 || y === mapSize - 1;
      const threshold = border ? 0.55 : density;
      if (r < threshold) {
        const spriteId = random() < 0.3 ? SPRITE_IDS.treeSmall : SPRITE_IDS.treeBasic;
        decorations.push({
          id: `tree_${x}_${y}`,
          kind: "TREE",
          position: { x, y },
          spriteId,
          footprint: { w: 1, h: 1 },
        });
        occupancy.occupy(x, y, 1, 1);
      }
    }
  }
  // A public garden in the middle of the home district. It covers 2x2 tiles, so
  // it is placed on the first free square rather than on one fixed cell.
  const home = rects.HOME_DISTRICT;
  const park = PARK_FOOTPRINT;
  const spot = firstFreeSquare(
    home.x + Math.floor(home.w / 2),
    home.y + Math.floor(home.h / 2),
    park,
    occupancy,
  );
  if (spot) {
    decorations.push({
      id: `park_${spot.x}_${spot.y}`,
      kind: "PARK",
      position: spot,
      spriteId: SPRITE_IDS.park,
      footprint: park,
    });
    occupancy.occupy(spot.x, spot.y, park.w, park.h);
  }
  return { decorations, fish };
}

/**
 * Searches outwards from a preferred cell for a square big enough to hold a
 * multi-tile decoration, so the park still lands near the middle of its
 * district when the exact centre is taken.
 */
function firstFreeSquare(
  preferredX: number,
  preferredY: number,
  footprint: Footprint,
  occupancy: Occupancy,
): GridPosition | null {
  for (let radius = 0; radius <= 6; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const x = preferredX + dx;
        const y = preferredY + dy;
        if (occupancy.areaFree(x, y, footprint.w, footprint.h)) return { x, y };
      }
    }
  }
  return null;
}

/**
 * Ponds go where the lawn is emptiest: a tile is eligible when its whole 3x3
 * neighbourhood is free, which keeps water away from buildings and roads.
 * Candidates are scanned on a coarse grid and spaced out, so a big map gets
 * several small ponds rather than one cluster.
 */
function pondPositions(
  mapSize: number,
  occupancy: Occupancy,
  random: () => number,
): GridPosition[] {
  const chosen: GridPosition[] = [];
  const maxPonds = Math.max(1, Math.floor(mapSize / 10));
  const spacing = Math.max(6, Math.floor(mapSize / 5));
  for (let y = 2; y < mapSize - 2 && chosen.length < maxPonds; y += 2) {
    for (let x = 2; x < mapSize - 2 && chosen.length < maxPonds; x += 2) {
      if (!occupancy.areaFree(x - 1, y - 1, 3, 3)) continue;
      if (chosen.some((p) => Math.abs(p.x - x) < spacing && Math.abs(p.y - y) < spacing)) continue;
      if (random() < 0.45) continue;
      chosen.push({ x, y });
    }
  }
  return chosen;
}

/**
 * Each character walks from the street to the door of one building, goes in,
 * and comes back out. The door is the front corner of the footprint, which is
 * where the entrance is drawn on the sprite.
 */
function doorOf(building: WorldBuilding): GridPosition {
  return {
    x: building.position.x + (building.footprint.w - 1) / 2,
    y: building.position.y + building.footprint.h - 0.5,
  };
}

/** Cars per lane, spread evenly along it. */
const CARS_PER_LANE = 2;

/**
 * Traffic on the central crossroads. Each road is two tiles wide, so it carries
 * one lane per direction; cars drive on the right, which is what decides which
 * tile belongs to which heading. Parked cars sit half on the verge, clear of
 * both lanes.
 */
function placeVehicles(mapSize: number, random: () => number): WorldVehicle[] {
  const road = Math.floor(mapSize / 2);
  const vehicles: WorldVehicle[] = [];
  const pick = () => CAR_COLOURS[Math.floor(random() * CAR_COLOURS.length)]!;
  /**
   * `lap` spaces the cars of one lane evenly along it. A random phase let two
   * of them start on the same tile, which read as one car drawn twice.
   */
  const drive = (id: string, from: GridPosition, to: GridPosition, lap: number) => {
    const periodMs = 14_000 + Math.floor(random() * 8000);
    vehicles.push({
      id,
      spriteId: carSpriteId(pick(), headingBetween(from, to)),
      from,
      to,
      periodMs,
      phaseMs: Math.round(periodMs * lap),
    });
  };

  const last = mapSize - 1;
  for (let i = 0; i < CARS_PER_LANE; i += 1) {
    const lap = i / CARS_PER_LANE;
    // Driving on the right: eastbound keeps the southern lane, westbound the
    // northern one, and the same rule turned a quarter turn for the other road.
    drive(`car_east_${i}`, { x: 0, y: road + 1 }, { x: last, y: road + 1 }, lap);
    drive(`car_west_${i}`, { x: last, y: road }, { x: 0, y: road }, lap);
    drive(`car_south_${i}`, { x: road, y: 0 }, { x: road, y: last }, lap);
    drive(`car_north_${i}`, { x: road + 1, y: last }, { x: road + 1, y: 0 }, lap);
  }

  // Parked: half a tile onto the verge either side of each road, so a moving
  // car never drives through one.
  const VERGE = 0.55;
  const spots: Array<{ position: GridPosition; heading: CarHeading }> = [
    { position: { x: road - 6, y: road - VERGE }, heading: "west" },
    { position: { x: road + 4, y: road + 1 + VERGE }, heading: "east" },
    { position: { x: road - VERGE, y: road - 5 }, heading: "north" },
    { position: { x: road + 1 + VERGE, y: road + 6 }, heading: "south" },
  ];
  spots.forEach(({ position, heading }, index) => {
    const along = heading === "east" || heading === "west" ? position.x : position.y;
    if (along < 1 || along >= mapSize - 1) return;
    vehicles.push({
      id: `car_parked_${index}`,
      spriteId: carSpriteId(pick(), heading),
      from: position,
      to: position,
      periodMs: 0,
      phaseMs: 0,
    });
  });
  return vehicles;
}

function placeCharacters(
  mapSize: number,
  buildings: readonly WorldBuilding[],
  random: () => number,
  count: number,
): WorldCharacter[] {
  const road = Math.floor(mapSize / 2);
  const characters: WorldCharacter[] = [];
  for (let i = 0; i < count; i += 1) {
    const target = buildings[Math.floor(random() * buildings.length)];
    if (target) {
      const door = doorOf(target);
      // Start a couple of tiles out in front, on the pavement side.
      const from = { x: door.x, y: Math.min(mapSize - 1, door.y + 2) };
      characters.push({
        id: `character_${i}`,
        position: from,
        spriteId: SPRITE_IDS.characterBasic,
        path: [from, door],
        entersBuildingId: target.id,
        insideMs: 3000 + Math.floor(random() * 5000),
        phaseMs: Math.floor(random() * 6000),
      });
      continue;
    }
    // No buildings yet: the character just wanders the central roads.
    const horizontal = random() < 0.5;
    const start = Math.floor(random() * (mapSize - 2)) + 1;
    const end = Math.floor(random() * (mapSize - 2)) + 1;
    const from = horizontal ? { x: start, y: road } : { x: road, y: start };
    const to = horizontal ? { x: end, y: road } : { x: road, y: end };
    characters.push({
      id: `character_${i}`,
      position: from,
      spriteId: SPRITE_IDS.characterBasic,
      path: [from, to],
      entersBuildingId: null,
      insideMs: 0,
      phaseMs: Math.floor(random() * 6000),
    });
  }
  return characters;
}

/**
 * WorldLayoutEngine: deterministic placement with collision validation.
 * Same entities + same seed -> same layout.
 */
export function layoutWorld(
  entities: readonly WorldEntity[],
  options: { mapSize: number; seed: number; cityLevel: number },
): LayoutResult {
  const { mapSize, seed, cityLevel } = options;
  const occupancy = new Occupancy(mapSize);
  const rects = computeDistrictRects(mapSize);
  const terrain = buildTerrain(mapSize, occupancy);
  const { buildings, unplaced, counts } = placeEntities(entities, rects, occupancy);
  reserveSignClearance(buildings, occupancy);
  const random = createSeededRandom(seed);
  const { decorations, fish } = placeDecorations(mapSize, rects, occupancy, random, cityLevel);
  const vehicles = placeVehicles(mapSize, random);
  const characters = placeCharacters(
    mapSize,
    buildings,
    random,
    Math.min(6, 1 + Math.floor(buildings.length / 2)),
  );
  const districts: DistrictArea[] = DISTRICT_IDS.map((id) => ({
    id,
    ...rects[id],
    buildingCount: counts[id],
  }));
  validateLayout(mapSize, buildings, decorations, terrain);
  return { terrain, buildings, decorations, fish, vehicles, characters, districts, unplaced };
}

/** Throws when two footprints overlap or leave the map: a bug, never a runtime state. */
export function validateLayout(
  mapSize: number,
  buildings: readonly WorldBuilding[],
  decorations: readonly WorldDecoration[],
  terrain: readonly WorldTerrainTile[],
): void {
  const seen = new Set<string>();
  const blocked = new Set(terrain.filter((t) => t.kind !== "GRASS").map((t) => `${t.x}:${t.y}`));
  const claim = (x: number, y: number, owner: string) => {
    if (x < 0 || y < 0 || x >= mapSize || y >= mapSize)
      throw new Error(`Hors carte : ${owner} (${x},${y})`);
    const key = `${x}:${y}`;
    if (seen.has(key) || blocked.has(key)) throw new Error(`Chevauchement : ${owner} (${x},${y})`);
    seen.add(key);
  };
  for (const b of buildings) {
    for (let dy = 0; dy < b.footprint.h; dy += 1)
      for (let dx = 0; dx < b.footprint.w; dx += 1)
        claim(b.position.x + dx, b.position.y + dy, b.id);
  }
  for (const d of decorations)
    for (let dy = 0; dy < d.footprint.h; dy += 1)
      for (let dx = 0; dx < d.footprint.w; dx += 1)
        claim(d.position.x + dx, d.position.y + dy, d.id);
}

/** Deterministic isometric draw order: back-to-front by (x + y), then x. */
export function zIndexOf(position: GridPosition, footprint: Footprint = { w: 1, h: 1 }): number {
  // Use the far corner of the footprint so 2x2 buildings sort behind 1x1 neighbours in front of them.
  return (
    (position.x + footprint.w - 1 + position.y + footprint.h - 1) * 1000 +
    (position.x + footprint.w - 1)
  );
}
