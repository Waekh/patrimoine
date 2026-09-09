import type { BuildingLevel, BuildingType } from "./building-levels";
import type { Footprint } from "@/types/world";

/**
 * Sprite id conventions. Ids are resolved through asset-manifest.json at
 * render time; file names never appear in application code.
 */
const BUILDING_SPRITE_PREFIX: Record<BuildingType, string> = {
  HOUSE: "house",
  APARTMENT: "apartment",
  BANK: "bank",
  FINANCIAL_BUILDING: "financial",
  REAL_ESTATE_BUILDING: "realestate",
  MARKET: "market",
  VAULT: "vault",
  PARK: "park",
  ROAD: "road",
  WAREHOUSE: "warehouse",
};

export function buildingSpriteId(type: BuildingType, level: BuildingLevel): string {
  return `${BUILDING_SPRITE_PREFIX[type]}_lv${level}`;
}

/** Ground footprint per building type and level. Level 4+ buildings grow to 2x2. */
export function buildingFootprint(type: BuildingType, level: BuildingLevel): Footprint {
  if (type === "PARK" || type === "ROAD") return { w: 1, h: 1 };
  if (type === "HOUSE") return { w: 1, h: 1 };
  return level >= 4 ? { w: 2, h: 2 } : { w: 1, h: 1 };
}

/** The public garden covers a 2x2 square: a single tile read as a green blob. */
export const PARK_FOOTPRINT: Footprint = { w: 2, h: 2 };

export const SPRITE_IDS = {
  terrainGrass: "terrain_grass",
  terrainWater: "terrain_water",
  terrainPavement: "terrain_pavement",
  /**
   * A street is two tiles wide, so each carriageway has its own tile: the
   * "inner" one carries the dashed centre line on the edge it shares with the
   * opposite lane, the "outer" one the solid kerb line. Drawing the centre line
   * on one tile of the pair is what makes it continuous down the street.
   */
  roadNSInner: "road_ns_inner",
  roadNSOuter: "road_ns_outer",
  roadEWInner: "road_ew_inner",
  roadEWOuter: "road_ew_outer",
  roadNSCrossing: "road_ns_crossing",
  roadEWCrossing: "road_ew_crossing",
  roadCross: "road_cross",
  treeBasic: "tree_basic",
  treeSmall: "tree_small",
  bush: "bush_basic",
  lamp: "lamp_post",
  park: "park_lv1",
  pond: "pond_lv1",
  fish: "fish_basic",
  characterBasic: "character_basic",
  selection: "selection_ring",
  signBoard: "sign_board",
  signBoardHigh: "sign_board_high",
  font: "font_5x7",
} as const;

/**
 * Sens de circulation, nommés depuis l'écran : "north" remonte vers le haut à
 * droite, "south" descend vers le bas à gauche, "east" descend vers le bas à
 * droite, "west" remonte vers le haut à gauche.
 *
 * Chaque sens a son propre sprite. Une voiture n'est jamais retournée par
 * miroir : la lumière du monde vient du haut à gauche, un miroir la ferait
 * venir du mauvais côté.
 */
export const CAR_HEADINGS = ["north", "east", "south", "west"] as const;
export type CarHeading = (typeof CAR_HEADINGS)[number];

/** Pas d'une case dans chaque sens, en coordonnées de grille. */
export const CAR_HEADING_STEP: Record<CarHeading, Readonly<{ x: number; y: number }>> = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
};

/** Sens dans lequel roule une voiture qui va de `from` à `to`. */
export function headingBetween(
  from: Readonly<{ x: number; y: number }>,
  to: Readonly<{ x: number; y: number }>,
): CarHeading {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "east" : "west";
  return dy >= 0 ? "south" : "north";
}

export const CAR_COLOURS = ["blue", "red", "sand"] as const;
export type CarColour = (typeof CAR_COLOURS)[number];

export function carSpriteId(colour: CarColour, heading: CarHeading): string {
  return `car_${colour}_${heading}`;
}
