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
  roadNS: "road_ns",
  roadEW: "road_ew",
  roadCross: "road_cross",
  treeBasic: "tree_basic",
  treeSmall: "tree_small",
  park: "park_lv1",
  pond: "pond_lv1",
  fish: "fish_basic",
  characterBasic: "character_basic",
  selection: "selection_ring",
  signBoard: "sign_board",
  font: "font_5x7",
} as const;
