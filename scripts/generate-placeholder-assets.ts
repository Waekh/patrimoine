import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PIXEL_PALETTE } from "../src/config/pixel-palette";
import { PixelCanvas, hex, shade, type RGBA } from "./lib/png";
import {
  type IsoBox,
  drawGroundShadow,
  drawHipRoof,
  drawIsoBox,
  faceBand,
  faceOrigin,
  faceSteps,
  fillDiamond,
  fillFaceEllipse,
  fillFaceRect,
  outlineDiamond,
} from "./lib/iso";
import { createSeededRandom, seedFromString } from "../src/services/world/seeded-random";
import { DISTRICT_EMBLEM, type DistrictId } from "../src/config/districts";
import { GLYPH_WIDTH } from "../src/config/pixel-font";
import {
  SIGN_BASE_Y,
  SIGN_BOARD_H,
  SIGN_BOARD_W,
  SIGN_BOARD_X,
  SIGN_H,
  SIGN_POST_H,
  SIGN_POST_H_HIGH,
  SIGN_W,
  signBoardY,
} from "../src/config/pixel-font";
import { buildFontAtlas, drawGlyph } from "./lib/font";
import { CAR_BODY_SWATCHES, CAR_PALETTE, CAR_SPRITES } from "./lib/car-sprite-data";
import {
  CAR_COLOURS,
  CAR_HEADINGS,
  carSpriteId,
  type CarColour,
  type CarHeading,
} from "../src/config/sprites";

/**
 * Generates PLACEHOLDER pixel-art sprites that respect the Pixel Art Bible
 * (2:1 isometric projection, 64x32 tile, top-left light, 1px outlines) and
 * writes public/assets/asset-manifest.json. Final artwork replaces these files
 * without touching application code.
 */
const TILE_W = 64;
const TILE_H = 32;
const OUT_DIR = path.join(process.cwd(), "public", "assets");
const OUTLINE = hex(PIXEL_PALETTE.outline);
/** A facade shorter than this has no clear band of wall to carry an emblem. */
const EMBLEM_MIN_HEIGHT = 34;
const SHADOW = hex(PIXEL_PALETTE.shadow, 90);
/** Ground shadow under a car, and the apron of canvas that has to hold it. */
const CAR_SHADOW_W = 42;
const CAR_SHADOW_H = 21;
const CAR_SHADOW_APRON = 6;
/**
 * Body colour per variant, as a rotation of the reference blue. One set of
 * pixels rotated three ways keeps the modelling identical on every car.
 */
const CAR_BODY_ROTATION: Record<CarColour, { degrees: number; saturation: number } | null> = {
  blue: null,
  red: { degrees: 145, saturation: 1 },
  sand: { degrees: 175, saturation: 0.42 },
};

interface ManifestEntry {
  id: string;
  type: "terrain" | "road" | "building" | "nature" | "character" | "effect" | "decoration" | "ui";
  category?: string;
  level?: number;
  file: string;
  width: number;
  height: number;
  anchor: { x: number; y: number };
  footprint?: { w: number; h: number };
  placeholder: boolean;
}

const entries: ManifestEntry[] = [];
const canvases = new Map<string, PixelCanvas>();

function save(
  entry: Omit<ManifestEntry, "placeholder"> & { placeholder?: boolean },
  canvas: PixelCanvas,
): void {
  const file = path.join(OUT_DIR, entry.file);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, canvas.toPng());
  entries.push({ ...entry, placeholder: entry.placeholder ?? true });
  canvases.set(entry.id, canvas);
}

/** Debug helper: composes selected sprites side by side (2x nearest) for a visual check. */
function writeContactSheet(file: string, ids: string[], scale = 2): void {
  const list = ids.map((id) => canvases.get(id)).filter((c): c is PixelCanvas => Boolean(c));
  const width = list.reduce((acc, c) => acc + c.width * scale + 8, 8);
  const height = Math.max(...list.map((c) => c.height * scale)) + 16;
  const sheet = new PixelCanvas(width, height);
  sheet.fillRect(0, 0, width, height, [27, 42, 58, 255]);
  let x = 8;
  for (const c of list) {
    const top = height - 8 - c.height * scale;
    for (let j = 0; j < c.height; j += 1) {
      for (let i = 0; i < c.width; i += 1) {
        const k = (j * c.width + i) * 4;
        const a = c.data[k + 3]!;
        if (a === 0) continue;
        sheet.fillRect(x + i * scale, top + j * scale, scale, scale, [
          c.data[k]!,
          c.data[k + 1]!,
          c.data[k + 2]!,
          a,
        ]);
      }
    }
    x += c.width * scale + 8;
  }
  writeFileSync(file, sheet.toPng());
}

/** Diamond centred on (cx, cy) with the given width/height. */
function diamond(cx: number, cy: number, w: number, h: number): Array<[number, number]> {
  return [
    [cx, cy - h / 2],
    [cx + w / 2, cy],
    [cx, cy + h / 2],
    [cx - w / 2, cy],
  ];
}

function drawDiamond(
  c: PixelCanvas,
  cx: number,
  cy: number,
  w: number,
  h: number,
  fill: RGBA,
  outline: RGBA | null = OUTLINE,
): void {
  c.fillPolygon(diamond(cx, cy, w, h), fill);
  if (outline) {
    const pts = diamond(cx, cy, w, h);
    for (let i = 0; i < 4; i += 1) {
      const a = pts[i]!;
      const b = pts[(i + 1) % 4]!;
      c.line(a[0], a[1], b[0], b[1], outline);
    }
  }
}

function terrainTile(
  fill: string,
  id: string,
  file: string,
  decorate?: (c: PixelCanvas) => void,
): void {
  const c = new PixelCanvas(TILE_W, TILE_H);
  drawDiamond(c, 32, 16, TILE_W, TILE_H, hex(fill), null);
  decorate?.(c);
  save(
    {
      id,
      type: id.startsWith("road") ? "road" : "terrain",
      file,
      width: TILE_W,
      height: TILE_H,
      anchor: { x: 32, y: 16 },
      footprint: { w: 1, h: 1 },
    },
    c,
  );
}

/** Speckle inside the tile diamond: |dx|/2 + |dy| < h/2 keeps it on the tile. */
function tileSpeckle(
  c: PixelCanvas,
  color: RGBA,
  random: () => number,
  count: number,
  runLength = 2,
): void {
  for (let k = 0; k < count; k += 1) {
    const dy = Math.round((random() - 0.5) * (TILE_H - 6));
    const span = Math.max(0, TILE_W / 2 - 6 - Math.abs(dy) * 2);
    const dx = Math.round((random() - 0.5) * span * 2);
    c.fillRect(32 + dx, 16 + dy, runLength, 1, color);
  }
}

/**
 * Kerb along the two upper edges of the diamond, inset by one step so it reads
 * as a raised edge rather than an outline. Left edge runs (32,0) -> (0,16),
 * right edge (32,0) -> (64,16).
 */
function tileKerb(c: PixelCanvas, color: RGBA): void {
  for (let i = 2; i < TILE_W / 2 - 2; i += 2) {
    c.fillRect(32 - i, i / 2 + 1, 2, 1, color);
    c.fillRect(30 + i, i / 2 + 1, 2, 1, color);
  }
}

function generateTerrain(): void {
  terrainTile(PIXEL_PALETTE.grass, "terrain_grass", "world/terrain/terrain_grass.png", (c) => {
    const random = createSeededRandom(seedFromString("terrain_grass"));
    const dark = hex(PIXEL_PALETTE.grassDark);
    const light = shade(hex(PIXEL_PALETTE.grass), 1.14);
    // Two tones of clumping, then a few bright blades: standard 16-bit ground.
    tileSpeckle(c, shade(dark, 1.06), random, 26, 3);
    tileSpeckle(c, dark, random, 14, 2);
    tileSpeckle(c, light, random, 10, 1);
  });
  terrainTile(PIXEL_PALETTE.water, "terrain_water", "world/terrain/terrain_water.png", (c) => {
    const random = createSeededRandom(seedFromString("terrain_water"));
    const deep = hex(PIXEL_PALETTE.waterDark);
    const foam = shade(hex(PIXEL_PALETTE.water), 1.3);
    // Wave crests follow the 2:1 slope so the surface reads as isometric.
    for (const [x, y, len] of [
      [20, 12, 8],
      [34, 17, 10],
      [26, 22, 6],
      [40, 9, 6],
    ] as const) {
      for (let i = 0; i < len; i += 2) c.fillRect(x + i, y + i / 2, 2, 1, deep);
      for (let i = 0; i < len - 2; i += 2) c.fillRect(x + i + 2, y + i / 2 - 1, 2, 1, foam);
    }
    tileSpeckle(c, shade(deep, 1.1), random, 12, 2);
  });
  const line = hex(PIXEL_PALETTE.roadLine);
  const kerb = shade(hex(PIXEL_PALETTE.road), 1.16);
  const grit = shade(hex(PIXEL_PALETTE.road), 0.9);
  const asphalt = (c: PixelCanvas, id: string): void => {
    tileSpeckle(c, grit, createSeededRandom(seedFromString(id)), 30, 2);
    tileKerb(c, kerb);
  };
  terrainTile(PIXEL_PALETTE.road, "road_ns", "world/roads/road_ns.png", (c) => {
    asphalt(c, "road_ns");
    for (let i = 0; i < 5; i += 1) c.fillRect(20 + i * 6, 10 + i * 3, 3, 1, line);
  });
  terrainTile(PIXEL_PALETTE.road, "road_ew", "world/roads/road_ew.png", (c) => {
    asphalt(c, "road_ew");
    for (let i = 0; i < 5; i += 1) c.fillRect(20 + i * 6, 22 - i * 3, 3, 1, line);
  });
  terrainTile(PIXEL_PALETTE.road, "road_cross", "world/roads/road_cross.png", (c) => {
    asphalt(c, "road_cross");
    // Painted box junction at the centre of the crossroads.
    for (let i = 0; i < 3; i += 1) {
      c.fillRect(26 + i * 4, 10 + i * 2, 2, 1, line);
      c.fillRect(34 + i * 4, 18 + i * 2, 2, 1, line);
      c.fillRect(26 + i * 4, 22 - i * 2, 2, 1, line);
      c.fillRect(34 + i * 4, 14 - i * 2, 2, 1, line);
    }
  });
}

type Material = "brick" | "stone" | "glass" | "metal" | "plaster";
type RoofKind = "flat" | "hip" | "lowpitch";
type EntranceKind = "door" | "portal" | "shutter" | "vaultDoor" | "shopfront";

interface BuildingStyle {
  wall: string;
  plinth: string;
  trim: string;
  glass?: string;
  material: Material;
  roof: RoofKind;
  entrance: EntranceKind;
  category: string;
  /** District the buildings of this style belong to. */
  district: DistrictId;
  /** False when the facade already carries its own sign, like a vault door. */
  emblem?: boolean;
  /** Vertical extrusion per level, in pixels. */
  heights: [number, number, number, number, number];
  /** Pixels between two floors: drives bands and window rows. */
  floor?: number;
  balconies?: boolean;
  columns?: boolean;
  arched?: boolean;
  rivets?: boolean;
}

const STYLES: Record<string, BuildingStyle> = {
  house: {
    wall: PIXEL_PALETTE.wall,
    plinth: PIXEL_PALETTE.stoneDark,
    trim: PIXEL_PALETTE.wallDark,
    glass: PIXEL_PALETTE.windowDark,
    material: "plaster",
    roof: "hip",
    entrance: "door",
    category: "real_estate",
    district: "HOME_DISTRICT",
    heights: [20, 24, 28, 32, 38],
    floor: 11,
  },
  apartment: {
    wall: PIXEL_PALETTE.brick,
    plinth: PIXEL_PALETTE.stoneDark,
    trim: PIXEL_PALETTE.concrete,
    glass: PIXEL_PALETTE.windowDark,
    material: "brick",
    roof: "flat",
    entrance: "door",
    category: "real_estate",
    district: "HOME_DISTRICT",
    heights: [34, 46, 58, 66, 86],
    floor: 10,
    balconies: true,
  },
  realestate: {
    wall: PIXEL_PALETTE.brickDark,
    plinth: PIXEL_PALETTE.stoneDark,
    trim: PIXEL_PALETTE.concrete,
    glass: PIXEL_PALETTE.windowDark,
    material: "brick",
    roof: "flat",
    entrance: "shopfront",
    category: "real_estate",
    district: "REAL_ESTATE_DISTRICT",
    heights: [32, 42, 54, 66, 82],
    floor: 10,
  },
  bank: {
    wall: PIXEL_PALETTE.stone,
    plinth: PIXEL_PALETTE.stoneDark,
    trim: PIXEL_PALETTE.gold,
    glass: PIXEL_PALETTE.windowDark,
    material: "stone",
    roof: "flat",
    entrance: "portal",
    category: "cash",
    district: "CASH_DISTRICT",
    heights: [26, 32, 38, 46, 58],
    floor: 12,
    columns: true,
  },
  vault: {
    wall: PIXEL_PALETTE.metal,
    plinth: PIXEL_PALETTE.metalDark,
    trim: PIXEL_PALETTE.gold,
    material: "metal",
    roof: "flat",
    entrance: "vaultDoor",
    category: "cash",
    district: "CASH_DISTRICT",
    heights: [20, 24, 28, 34, 42],
    floor: 14,
    rivets: true,
  },
  financial: {
    wall: PIXEL_PALETTE.glass,
    plinth: PIXEL_PALETTE.concreteDark,
    trim: PIXEL_PALETTE.concrete,
    glass: PIXEL_PALETTE.glassPane,
    material: "glass",
    roof: "flat",
    entrance: "shopfront",
    category: "financial",
    district: "FINANCE_DISTRICT",
    heights: [42, 58, 74, 90, 114],
    floor: 8,
  },
  market: {
    wall: PIXEL_PALETTE.glassDark,
    plinth: PIXEL_PALETTE.stoneDark,
    trim: PIXEL_PALETTE.gold,
    glass: PIXEL_PALETTE.windowDark,
    material: "stone",
    roof: "flat",
    entrance: "portal",
    category: "financial",
    district: "FINANCE_DISTRICT",
    heights: [30, 38, 50, 62, 78],
    floor: 11,
    arched: true,
  },
  warehouse: {
    wall: PIXEL_PALETTE.wood,
    plinth: PIXEL_PALETTE.stoneDark,
    trim: PIXEL_PALETTE.metal,
    material: "metal",
    roof: "lowpitch",
    entrance: "shutter",
    category: "alternative",
    district: "ALTERNATIVE_DISTRICT",
    heights: [18, 22, 26, 32, 40],
    floor: 20,
  },
};

/** Material texture on both faces: mortar joints, stone courses, ribs, mullions. */
function drawMaterial(c: PixelCanvas, box: IsoBox, style: BuildingStyle): void {
  const wall = hex(style.wall);
  for (const face of ["left", "right"] as const) {
    const tone = face === "left" ? wall : shade(wall, 0.82);
    const steps = faceSteps(box);
    switch (style.material) {
      case "brick": {
        const mortar = shade(tone, 0.88);
        for (let v = 6; v < box.height - 2; v += 3)
          faceBand(c, box, face, v, 1, mortar, { dither: true });
        break;
      }
      case "stone": {
        const seam = shade(tone, 0.9);
        for (let v = 7; v < box.height - 2; v += 6) faceBand(c, box, face, v, 1, seam);
        fillFaceRect(c, box, face, 0, 5, steps, box.height - 7, seam, { every: 4 });
        break;
      }
      case "metal": {
        fillFaceRect(c, box, face, 0, 1, steps, box.height - 2, shade(tone, 0.87), { every: 2 });
        break;
      }
      case "glass": {
        fillFaceRect(c, box, face, 0, 1, steps, box.height - 2, shade(tone, 0.76), { every: 3 });
        break;
      }
      case "plaster": {
        fillFaceRect(c, box, face, 0, 2, steps, Math.min(7, box.height - 4), shade(tone, 0.94), {
          dither: true,
        });
        break;
      }
    }
  }
}

/** Base course: a darker skirt with a light lip, which sets the building on the ground. */
function drawPlinth(c: PixelCanvas, box: IsoBox, style: BuildingStyle): void {
  const plinth = hex(style.plinth);
  for (const face of ["left", "right"] as const) {
    const tone = face === "left" ? plinth : shade(plinth, 0.82);
    faceBand(c, box, face, 1, 4, tone);
    faceBand(c, box, face, 5, 1, shade(tone, 1.2));
  }
}

function drawFloorBands(c: PixelCanvas, box: IsoBox, style: BuildingStyle): void {
  const spacing = style.floor ?? 10;
  const trim = hex(style.trim);
  for (const face of ["left", "right"] as const) {
    const tone = shade(face === "left" ? trim : shade(trim, 0.82), 0.9);
    for (let v = 6 + spacing; v < box.height - 4; v += spacing) faceBand(c, box, face, v, 1, tone);
  }
}

function drawWindows(
  c: PixelCanvas,
  box: IsoBox,
  style: BuildingStyle,
  random: () => number,
): void {
  const spacing = style.floor ?? 10;
  const steps = faceSteps(box);
  const glass = hex(style.glass ?? PIXEL_PALETTE.windowDark);
  const lit = hex(PIXEL_PALETTE.windowLit);
  const sill = hex(style.trim);
  const tall = style.material === "glass" ? 5 : 4;
  for (const face of ["left", "right"] as const) {
    const dim = face === "left" ? 1 : 0.86;
    for (let v = 8; v + tall + 2 < box.height; v += spacing) {
      for (let u = 1; u + 2 <= steps - 1; u += 3) {
        const isLit = random() < (style.material === "glass" ? 0.16 : 0.26);
        const body = isLit ? shade(lit, dim) : shade(glass, dim);
        fillFaceRect(c, box, face, u, v, 2, tall, body);
        // Sill, then a single bright pixel run: the glass reflection.
        fillFaceRect(c, box, face, u, v - 1, 2, 1, shade(sill, dim));
        fillFaceRect(c, box, face, u, v + tall - 1, 1, 1, shade(body, 1.3));
        if (style.arched) fillFaceRect(c, box, face, u, v + tall, 1, 1, body);
        if (style.balconies && v > 10) {
          const slab = shade(hex(PIXEL_PALETTE.concrete), dim);
          fillFaceRect(c, box, face, u - 1, v - 3, 4, 1, slab);
          fillFaceRect(c, box, face, u - 1, v - 2, 4, 1, shade(slab, 0.8), { every: 2 });
        }
      }
    }
  }
}

function drawColumns(c: PixelCanvas, box: IsoBox, style: BuildingStyle): void {
  const steps = faceSteps(box);
  const column = shade(hex(style.wall), 1.12);
  const shadow = shade(hex(style.wall), 0.8);
  for (const face of ["left", "right"] as const) {
    for (let u = 1; u < steps - 1; u += 3) {
      fillFaceRect(
        c,
        box,
        face,
        u,
        6,
        1,
        box.height - 12,
        face === "left" ? column : shade(column, 0.85),
      );
      fillFaceRect(c, box, face, u + 1, 6, 1, box.height - 12, shadow);
    }
  }
}

/** Riveted armour plating: corner buttresses plus rivet lines top and bottom. */
function drawRivets(c: PixelCanvas, box: IsoBox): void {
  const rivet = shade(hex(PIXEL_PALETTE.metal), 1.3);
  const dark = hex(PIXEL_PALETTE.metalDark);
  const steps = faceSteps(box);
  for (const face of ["left", "right"] as const) {
    const dim = face === "left" ? 1 : 0.84;
    // Buttress at each end of the face, the vault's heavy corner armour.
    for (const u of [0, steps - 2]) {
      fillFaceRect(c, box, face, u, 1, 2, box.height - 2, shade(dark, dim));
      fillFaceRect(c, box, face, u, 1, 1, box.height - 2, shade(rivet, dim * 0.9));
      for (let v = 4; v < box.height - 3; v += 5)
        fillFaceRect(c, box, face, u + 1, v, 1, 1, shade(rivet, dim));
    }
    for (let u = 3; u < steps - 2; u += 3) {
      fillFaceRect(c, box, face, u, 2, 1, 1, shade(rivet, dim));
      fillFaceRect(c, box, face, u, box.height - 4, 1, 1, shade(rivet, dim));
    }
    // Welded seam at mid height.
    faceBand(c, box, face, Math.floor(box.height / 2) - 6, 1, shade(dark, dim));
  }
}

/**
 * Ground-floor doorway, sized off the building so it stays legible on a tower:
 * recessed opening, glazed leaves with a mullion, lit transom, projecting
 * canopy and a couple of steps. Drawn on the left (front) face.
 */
function drawDoorway(
  c: PixelCanvas,
  box: IsoBox,
  style: BuildingStyle,
  centre: number,
  options: { halfWidth?: number; height?: number } = {},
): void {
  const half = options.halfWidth ?? (faceSteps(box) >= 24 ? 4 : 3);
  const tall = Math.min(options.height ?? 15, Math.max(9, box.height - 6));
  const u = centre - half;
  const span = half * 2 + 1;
  const trim = hex(style.trim);
  // The leaves take a dark tone of their own rather than one derived from the
  // wall: on a glass tower a glass-coloured door would vanish into the facade.
  const jamb = hex(PIXEL_PALETTE.outline);
  const leaf = hex(PIXEL_PALETTE.windowDark);
  const concrete = hex(PIXEL_PALETTE.concrete);

  // Reveal, a bright surround, then the door leaves inside it.
  fillFaceRect(c, box, "left", u - 1, 1, span + 2, tall + 1, shade(trim, 1.2));
  fillFaceRect(c, box, "left", u, 1, span, tall, jamb);
  fillFaceRect(c, box, "left", u + 1, 2, span - 2, tall - 4, leaf);
  fillFaceRect(c, box, "left", u + 1, 2, span - 2, tall - 4, shade(leaf, 1.35), { every: 3 });
  // Mullion between the two leaves, and a handle on each.
  fillFaceRect(c, box, "left", centre, 2, 1, tall - 4, shade(trim, 1.05));
  fillFaceRect(c, box, "left", centre - 1, Math.floor(tall / 2) - 1, 1, 1, hex(PIXEL_PALETTE.gold));
  fillFaceRect(c, box, "left", centre + 1, Math.floor(tall / 2) - 1, 1, 1, hex(PIXEL_PALETTE.gold));
  // Lit transom above the leaves, then the lintel.
  fillFaceRect(c, box, "left", u + 1, tall - 2, span - 2, 2, hex(PIXEL_PALETTE.windowLit));
  fillFaceRect(c, box, "left", u, tall, span, 1, trim);
  // Canopy: one course wider than the opening, with a shaded underside.
  fillFaceRect(c, box, "left", u - 1, tall + 1, span + 2, 1, shade(trim, 1.15));
  fillFaceRect(c, box, "left", u - 1, tall + 2, span + 2, 1, shade(trim, 0.78));
  // Two steps down to the pavement.
  fillFaceRect(c, box, "left", u - 1, 0, span + 2, 1, concrete);
  fillFaceRect(c, box, "left", u, 1, span, 1, shade(concrete, 0.88));
}

function drawEntrance(c: PixelCanvas, box: IsoBox, style: BuildingStyle): void {
  const steps = faceSteps(box);
  const centre = Math.floor(steps / 2);
  const trim = hex(style.trim);
  switch (style.entrance) {
    case "door": {
      // A house keeps a modest timber door; a block of flats gets a real porch.
      if (box.height <= 30) {
        const wood = hex(PIXEL_PALETTE.wood);
        fillFaceRect(c, box, "left", centre - 2, 1, 5, 10, shade(wood, 0.72));
        fillFaceRect(c, box, "left", centre - 1, 2, 3, 7, shade(wood, 0.95));
        fillFaceRect(c, box, "left", centre - 1, 9, 3, 1, hex(PIXEL_PALETTE.windowLit));
        fillFaceRect(c, box, "left", centre + 1, 5, 1, 1, hex(PIXEL_PALETTE.gold));
        fillFaceRect(c, box, "left", centre - 2, 11, 5, 1, trim);
        fillFaceRect(c, box, "left", centre - 3, 12, 7, 1, shade(trim, 1.15));
        fillFaceRect(c, box, "left", centre - 3, 0, 7, 1, hex(PIXEL_PALETTE.concrete));
      } else {
        drawDoorway(c, box, style, centre);
      }
      break;
    }
    case "portal": {
      const stone = shade(hex(style.wall), 1.1);
      const half = steps >= 24 ? 4 : 3;
      const span = half * 2 + 1;
      const tall = Math.min(14, Math.max(9, box.height - 8));
      // Recessed portal with a bronze door and a lit fanlight over it.
      fillFaceRect(c, box, "left", centre - half, 1, span, tall, shade(stone, 0.62));
      fillFaceRect(
        c,
        box,
        "left",
        centre - half + 1,
        2,
        span - 2,
        tall - 4,
        hex(PIXEL_PALETTE.wood),
      );
      fillFaceRect(c, box, "left", centre, 2, 1, tall - 4, shade(trim, 1.1));
      fillFaceRect(
        c,
        box,
        "left",
        centre - half + 1,
        tall - 2,
        span - 2,
        2,
        hex(PIXEL_PALETTE.windowLit),
      );
      fillFaceRect(c, box, "left", centre - half, tall, span, 1, trim);
      fillFaceRect(c, box, "left", centre - half - 1, tall + 1, span + 2, 1, trim);
      // Pediment above the portal, and steps below it.
      for (let k = 0; k < half; k += 1)
        fillFaceRect(
          c,
          box,
          "left",
          centre - half + 1 + k,
          tall + 2 + k,
          span - 2 - k * 2,
          1,
          stone,
        );
      fillFaceRect(c, box, "left", centre - half - 1, 0, span + 2, 1, hex(PIXEL_PALETTE.concrete));
      break;
    }
    case "shutter": {
      const metal = hex(PIXEL_PALETTE.metal);
      const concrete = hex(PIXEL_PALETTE.concrete);
      // One loading bay per 12 steps of facade, so the bays never run together.
      const bays = Math.max(1, Math.floor(steps / 12));
      const pitch = Math.floor(steps / (bays + 1));
      for (let bay = 1; bay <= bays; bay += 1) {
        const u = bay * pitch - 3;
        fillFaceRect(c, box, "left", u, 1, 7, 11, shade(metal, 0.72));
        fillFaceRect(c, box, "left", u, 1, 7, 11, shade(metal, 0.9), { dither: true });
        // Slat lines follow the face slope, then the lintel above the bay.
        for (let v = 2; v < 11; v += 3)
          fillFaceRect(c, box, "left", u, v, 7, 1, shade(metal, 0.62));
        fillFaceRect(c, box, "left", u, 12, 7, 1, trim);
        fillFaceRect(c, box, "left", u - 1, 12, 9, 1, shade(concrete, 0.9));
        // Concrete dock apron in front of the bay.
        fillFaceRect(c, box, "left", u - 1, 0, 9, 1, concrete);
        fillFaceRect(c, box, "left", u + 2, 5, 2, 1, shade(metal, 1.3));
      }
      // Painted band with a service door on the right-hand face.
      faceBand(c, box, "right", 12, 2, shade(trim, 0.8));
      fillFaceRect(c, box, "right", 2, 1, 2, 8, shade(concrete, 0.7));
      fillFaceRect(c, box, "right", 2, 9, 2, 1, shade(trim, 0.8));
      break;
    }
    case "vaultDoor": {
      const ring = hex(PIXEL_PALETTE.metalDark);
      const disc = shade(hex(PIXEL_PALETTE.metal), 1.1);
      const gold = hex(PIXEL_PALETTE.gold);
      const ru = Math.max(4, Math.min(7, Math.floor(steps / 3)));
      const rv = Math.max(6, Math.min(11, Math.floor(box.height / 3)));
      const centreV = Math.min(Math.max(rv + 3, Math.floor(box.height / 2)), box.height - rv - 5);
      // Recessed jamb, gold rim, brushed door, then the spokes of the wheel.
      fillFaceEllipse(c, box, "left", centre, centreV, ru + 2, rv + 2, shade(ring, 0.8));
      fillFaceEllipse(c, box, "left", centre, centreV, ru + 1, rv + 1, shade(gold, 0.85));
      fillFaceEllipse(c, box, "left", centre, centreV, ru, rv, disc);
      fillFaceEllipse(c, box, "left", centre, centreV, ru - 1, rv - 1, shade(disc, 0.9), {
        dither: true,
      });
      for (let k = -rv + 2; k <= rv - 2; k += 1)
        fillFaceRect(c, box, "left", centre, centreV + k, 1, 1, shade(disc, 0.78));
      fillFaceRect(c, box, "left", centre - ru + 1, centreV, ru * 2 - 1, 1, shade(disc, 0.78));
      fillFaceEllipse(c, box, "left", centre, centreV, 2, 3, ring);
      fillFaceRect(c, box, "left", centre, centreV, 1, 1, gold);
      // Threshold slab in front of the door.
      fillFaceRect(c, box, "left", centre - ru - 2, 1, ru * 2 + 5, 1, hex(PIXEL_PALETTE.concrete));
      break;
    }
    case "shopfront": {
      const pane = hex(style.glass ?? PIXEL_PALETTE.glassPane);
      const awning = hex(PIXEL_PALETTE.awning);
      // Glazed ground floor with mullions, capped by a canvas awning...
      for (const face of ["left", "right"] as const) {
        fillFaceRect(c, box, face, 1, 2, steps - 2, 9, shade(pane, face === "left" ? 0.9 : 0.76));
        fillFaceRect(c, box, face, 1, 2, steps - 2, 9, shade(pane, face === "left" ? 1.05 : 0.9), {
          every: 3,
        });
        fillFaceRect(c, box, face, 1, 11, steps - 2, 2, shade(awning, face === "left" ? 1 : 0.82));
        fillFaceRect(c, box, face, 1, 11, steps - 2, 2, shade(awning, 1.35), { every: 2 });
        fillFaceRect(c, box, face, 1, 1, steps - 2, 1, hex(PIXEL_PALETTE.concrete));
      }
      // ...and a proper entrance punched through the middle of the shopfront.
      drawDoorway(c, box, style, centre, { height: 13 });
      break;
    }
  }
}

/** Vents, water tank and antenna: the silhouette detail that sells a flat roof. */
/**
 * District emblem on the upper facade: a lit plaque carrying one glyph of the
 * sign font, so a bank block reads as banking without a click. Skipped when the
 * wall is too short to hold it, which is what leaves the small satellites of a
 * block plain and marks only its anchor.
 */
function drawEmblem(c: PixelCanvas, box: IsoBox, style: BuildingStyle): void {
  const glyph = DISTRICT_EMBLEM[style.district];
  if (!glyph || style.emblem === false) return;
  const steps = faceSteps(box);
  // Needs a clear band of wall above the ground floor and room either side.
  if (box.height < EMBLEM_MIN_HEIGHT || steps < 8) return;

  // The plaque is four steps wide (8 px) and 11 px tall, which frames the 5x7
  // glyph with a one-pixel margin once the glyph is centred inside it.
  const plaqueW = 4;
  const plaqueH = 11;
  const u = Math.floor(steps / 2) - 2;
  const v = box.height - plaqueH - 4;
  const trim = hex(style.trim);
  fillFaceRect(c, box, "left", u - 1, v - 1, plaqueW + 2, plaqueH + 2, hex(PIXEL_PALETTE.outline));
  fillFaceRect(c, box, "left", u, v, plaqueW, plaqueH, shade(trim, 1.15));
  fillFaceRect(c, box, "left", u, v, plaqueW, 1, shade(trim, 1.4));

  // The glyph is a bitmap, so it goes on the canvas rather than into a face
  // rectangle: centred on the plaque, which spans 2 * plaqueW pixels across.
  const origin = faceOrigin(box, "left", u);
  drawGlyph(
    c,
    glyph,
    Math.round(origin.x + plaqueW - Math.floor(GLYPH_WIDTH / 2) - 1),
    Math.round(origin.y - v - plaqueH + 2),
    hex(PIXEL_PALETTE.outline),
  );
}

function drawRoofFurniture(
  c: PixelCanvas,
  box: IsoBox,
  level: number,
  roofY: number,
  random: () => number,
): void {
  const metal = hex(PIXEL_PALETTE.metal);
  const scale = box.w / 64;
  const vent: IsoBox = {
    cx: box.cx - Math.round(10 * scale),
    baseY: roofY + Math.round(4 * scale),
    w: 14,
    h: 7,
    height: 5,
  };
  drawIsoBox(c, vent, { base: shade(metal, 0.95), outline: OUTLINE });
  if (level >= 3) {
    const tank: IsoBox = {
      cx: box.cx + Math.round(10 * scale),
      baseY: roofY - Math.round(1 * scale),
      w: 16,
      h: 8,
      height: 9,
    };
    drawIsoBox(c, tank, { base: hex(PIXEL_PALETTE.metalDark), outline: OUTLINE });
    fillFaceRect(c, tank, "left", 0, 3, faceSteps(tank), 1, shade(metal, 1.15));
  }
  if (level >= 4) {
    const x = box.cx + (random() < 0.5 ? -4 : 6);
    const top = roofY - 16;
    c.line(x, roofY, x, top, hex(PIXEL_PALETTE.metalDark));
    c.fillRect(x - 3, top + 4, 7, 1, hex(PIXEL_PALETTE.metalDark));
    c.fillRect(x - 1, top - 1, 2, 2, hex(PIXEL_PALETTE.gold));
  }
}

function generateBuilding(kind: string, style: BuildingStyle, level: number): void {
  const id = `${kind}_lv${level}`;
  const random = createSeededRandom(seedFromString(id));
  const footprint = kind === "house" ? 1 : level < 4 ? 1 : 2;
  const w = TILE_W * footprint;
  const h = TILE_H * footprint;
  const height = style.heights[level - 1]!;
  const roofExtra =
    style.roof === "hip" ? w / 2 + 12 : style.roof === "lowpitch" ? Math.round(w / 8) + 14 : 20;
  const canvasH = Math.round(h + height + roofExtra + 8);
  const c = new PixelCanvas(w + 8, canvasH);
  const cx = w / 2 + 4;
  const baseY = canvasH - h / 2 - 5;
  const box: IsoBox = { cx, baseY, w, h, height };

  drawGroundShadow(c, box, SHADOW);
  drawIsoBox(c, box, { base: hex(style.wall), outline: OUTLINE });
  drawMaterial(c, box, style);
  drawPlinth(c, box, style);
  if (style.columns) drawColumns(c, box, style);
  drawFloorBands(c, box, style);
  if (style.glass || style.material === "glass") drawWindows(c, box, style, random);
  if (style.rivets) drawRivets(c, box);
  drawEntrance(c, box, style);
  drawEmblem(c, box, style);

  const roofY = baseY - height;
  if (style.roof === "flat") {
    // Parapet ring, then a recessed deck tinted by the building's material.
    const deck = hex(
      style.material === "metal"
        ? PIXEL_PALETTE.metalDark
        : style.material === "glass"
          ? PIXEL_PALETTE.concreteDark
          : PIXEL_PALETTE.concrete,
    );
    fillDiamond(c, cx, roofY + 1, w - 8, h - 4, deck);
    // Gravel and a walkway ring, so a large deck is not a flat colour field.
    const gravel: IsoBox = { cx, baseY: roofY + 1, w: w - 8, h: h - 4, height: 0 };
    for (let u = 1; u < faceSteps(gravel); u += 2)
      fillFaceRect(c, gravel, "left", u, 0, 1, 1, shade(deck, 1.12));
    fillDiamond(c, cx, roofY + 1, w - 20, h - 10, shade(deck, 0.92));
    outlineDiamond(c, cx, roofY + 1, w - 20, h - 10, shade(deck, 1.1));
    outlineDiamond(c, cx, roofY + 1, w - 8, h - 4, shade(deck, 0.72));
    faceBand(c, box, "left", height - 3, 3, shade(hex(style.trim), 1.05));
    faceBand(c, box, "right", height - 3, 3, shade(hex(style.trim), 0.86));
    drawRoofFurniture(c, box, level, roofY, random);
  } else if (style.roof === "hip") {
    const tile = hex(PIXEL_PALETTE.roof);
    const rise = Math.round(w / 4);
    const roof = drawHipRoof(c, cx, roofY, w + 6, h + 3, rise, tile, OUTLINE);
    // Right-hand slope in shadow, same light direction as the walls.
    c.replaceInRect(cx, roofY - rise - 4, w / 2 + 8, rise + h + 10, tile, shade(tile, 0.78));
    // The chimney emerges from the shaded slope, halfway up the pitch.
    const chimney: IsoBox = {
      cx: cx + Math.round(w / 5),
      baseY: roofY - Math.round(rise / 2),
      w: 10,
      h: 5,
      height: 14,
    };
    drawIsoBox(c, chimney, { base: hex(PIXEL_PALETTE.brickDark), outline: OUTLINE });
    faceBand(c, chimney, "left", 12, 2, hex(PIXEL_PALETTE.stoneDark));
    faceBand(c, chimney, "right", 12, 2, shade(hex(PIXEL_PALETTE.stoneDark), 0.82));
    fillDiamond(c, chimney.cx, chimney.baseY - chimney.height, 6, 3, hex(PIXEL_PALETTE.outline));
    // Dormer on the lit slope, a level-3+ luxury.
    if (level >= 3) {
      const dormer: IsoBox = {
        cx: cx - Math.round(w / 5),
        baseY: roofY - Math.round(rise / 4),
        w: 12,
        h: 6,
        height: 7,
      };
      drawIsoBox(c, dormer, { base: hex(style.wall), outline: OUTLINE });
      fillFaceRect(c, dormer, "left", 1, 2, 1, 4, hex(PIXEL_PALETTE.windowLit));
      fillDiamond(c, dormer.cx, dormer.baseY - dormer.height, 12, 6, tile);
      outlineDiamond(c, dormer.cx, dormer.baseY - dormer.height, 12, 6, OUTLINE);
    }
    void roof;
  } else {
    const metal = hex(PIXEL_PALETTE.metal);
    const rise = Math.round(w / 8);
    const roof = drawHipRoof(c, cx, roofY, w + 4, h + 2, rise, metal, OUTLINE);
    c.replaceInRect(cx, roofY - rise - 4, w / 2 + 6, rise + h + 10, metal, shade(metal, 0.82));
    // The ridge plate faces upwards, so it keeps the lit tone on both halves.
    fillDiamond(c, cx, roof.topY, roof.topW, roof.topH, shade(metal, 1.06));
    outlineDiamond(c, cx, roof.topY, roof.topW, roof.topH, OUTLINE);
    // Skylights along the ridge, plus a ridge vent and an extractor at scale.
    const pane = hex(PIXEL_PALETTE.glassPane);
    const count = footprint === 2 ? 3 : 2;
    for (let k = 0; k < count; k += 1) {
      const dx = (k - (count - 1) / 2) * 16;
      fillDiamond(c, cx + dx, roof.topY, 10, 5, dx >= 0 ? shade(pane, 0.85) : pane);
      outlineDiamond(c, cx + dx, roof.topY, 10, 5, hex(PIXEL_PALETTE.metalDark));
    }
    const extractor: IsoBox = {
      cx: cx - Math.round(w / 4),
      baseY: roof.topY + 4,
      w: 12,
      h: 6,
      height: 6,
    };
    drawIsoBox(c, extractor, { base: hex(PIXEL_PALETTE.metalDark), outline: OUTLINE });
    fillDiamond(
      c,
      extractor.cx,
      extractor.baseY - extractor.height,
      8,
      4,
      hex(PIXEL_PALETTE.metal),
    );
    if (level >= 4) {
      // Ridge ventilators: a second silhouette detail once the shed gets big.
      for (const dx of [-6, 10] as const) {
        const cowl: IsoBox = {
          cx: cx + dx * 2,
          baseY: roof.topY + 2,
          w: 10,
          h: 5,
          height: 9,
        };
        drawIsoBox(c, cowl, { base: hex(PIXEL_PALETTE.metal), outline: OUTLINE });
        fillDiamond(c, cowl.cx, cowl.baseY - cowl.height, 12, 6, hex(PIXEL_PALETTE.metalDark));
        outlineDiamond(c, cowl.cx, cowl.baseY - cowl.height, 12, 6, OUTLINE);
      }
    }
  }

  save(
    {
      id,
      type: "building",
      category: style.category,
      level,
      file: `world/buildings/${id}.png`,
      width: c.width,
      height: c.height,
      anchor: { x: cx, y: baseY },
      footprint: { w: footprint, h: footprint },
    },
    c,
  );
}

/**
 * Filled ellipse by scanline, with a 1 px outline and a shaded lower-right
 * quarter, so foliage follows the same light direction as the buildings.
 */
function drawCanopy(
  c: PixelCanvas,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  base: RGBA,
): void {
  const rows = (radiusX: number, radiusY: number): number[] => {
    const widths: number[] = [];
    for (let dy = -radiusY; dy <= radiusY; dy += 1) {
      const t = dy / radiusY;
      widths.push(Math.floor(radiusX * Math.sqrt(Math.max(0, 1 - t * t))));
    }
    return widths;
  };
  const outline = rows(rx + 1, ry + 1);
  outline.forEach((halfWidth, index) => {
    if (halfWidth <= 0) return;
    c.fillRect(cx - halfWidth, cy - (ry + 1) + index, halfWidth * 2 + 1, 1, OUTLINE);
  });
  const fill = rows(rx, ry);
  fill.forEach((halfWidth, index) => {
    if (halfWidth <= 0) return;
    const y = cy - ry + index;
    c.fillRect(cx - halfWidth, y, halfWidth * 2 + 1, 1, base);
    // Lower-right quarter in shadow, like the right face of a building.
    if (y > cy) c.fillRect(cx, y, halfWidth + 1, 1, shade(base, 0.82));
  });
}

function generateNature(): void {
  const tree = (id: string, canopyRadius: number, trunkHeight: number) => {
    const c = new PixelCanvas(32, 48);
    const cx = 16;
    const baseY = 40;
    c.fillPolygon(diamond(cx + 3, baseY + 2, 18, 9), SHADOW);
    const wood = hex(PIXEL_PALETTE.wood);
    c.fillRect(cx - 2, baseY - trunkHeight, 4, trunkHeight, wood);
    c.fillRect(cx + 1, baseY - trunkHeight, 1, trunkHeight, shade(wood, 0.82));
    drawCanopy(
      c,
      cx,
      baseY - trunkHeight - canopyRadius + 2,
      canopyRadius + 2,
      canopyRadius,
      hex(PIXEL_PALETTE.leaf),
    );
    save(
      {
        id,
        type: "nature",
        file: `world/nature/${id}.png`,
        width: 32,
        height: 48,
        anchor: { x: cx, y: baseY },
        footprint: { w: 1, h: 1 },
      },
      c,
    );
  };
  tree("tree_basic", 10, 9);
  tree("tree_small", 7, 7);

  generatePark();
  generatePond();
}

/**
 * Public garden covering a 2x2 square. A single tile was far too small: the
 * park read as a green blob among the buildings, so it now gets the room for
 * gravel walks, a bandstand, a lily pond, benches, beds and shade trees.
 */
function generatePark(): void {
  const W = TILE_W * 2;
  const D = TILE_H * 2;
  const H = D + 42;
  const c = new PixelCanvas(W, H);
  const cx = W / 2;
  const cy = H - D / 2 - 1;
  const lawn = hex(PIXEL_PALETTE.grass);
  const gravel = hex(PIXEL_PALETTE.concrete);
  const hedge = hex(PIXEL_PALETTE.leafDark);
  const random = createSeededRandom(seedFromString("park_lv1"));

  drawDiamond(c, cx, cy, W, D, lawn, OUTLINE);
  // Mown stripes follow the 2:1 slope, like every other ground texture.
  const plot: IsoBox = { cx, baseY: cy, w: W, h: D, height: 0 };
  for (let u = 1; u < faceSteps(plot); u += 2)
    fillFaceRect(c, plot, "left", u, 0, 1, 1, shade(lawn, 0.93));

  // Gravel cross. A walk along a grid axis moves 2 px across for 1 px down, and
  // a point is inside the diamond while |dx| / 2 + |dy| <= D / 2. With dx = 2i
  // and dy = i that gives |i| <= D / 4, so the walk stops there; going further
  // spills gravel onto the grass outside the tile.
  const reach = D / 4 - 3;
  for (let i = -reach; i <= reach; i += 1) {
    for (const dx of [i * 2, -i * 2]) {
      c.fillRect(cx + dx - 3, cy + i, 6, 1, gravel);
      c.fillRect(cx + dx - 3, cy + i, 1, 1, shade(gravel, 0.86));
    }
  }
  // Clipped hedge along the two rear edges.
  for (let i = 0; i < W / 2 - 3; i += 2) {
    c.fillRect(cx - i, cy - D / 2 + i / 2 + 1, 2, 3, hedge);
    c.fillRect(cx - 2 + i, cy - D / 2 + i / 2 + 1, 2, 3, shade(hedge, 0.85));
  }

  // Ornamental pond in the near quarter, with a lily pad on it.
  const water = hex(PIXEL_PALETTE.water);
  fillDiamond(c, cx - 22, cy + 12, 30, 15, hex(PIXEL_PALETTE.wood));
  fillDiamond(c, cx - 22, cy + 12, 26, 13, water);
  outlineDiamond(c, cx - 22, cy + 12, 26, 13, shade(hex(PIXEL_PALETTE.waterDark), 0.9));
  const surface: IsoBox = { cx: cx - 22, baseY: cy + 12, w: 26, h: 13, height: 0 };
  for (let u = 1; u < faceSteps(surface); u += 2)
    fillFaceRect(c, surface, "left", u, 0, 2, 1, shade(water, 1.2));
  fillDiamond(c, cx - 24, cy + 12, 7, 4, hex(PIXEL_PALETTE.leaf));

  // Bandstand at the crossing of the walks: octagonal deck on posts, tiled roof.
  const deckY = cy - 4;
  fillDiamond(c, cx, deckY, 34, 17, hex(PIXEL_PALETTE.stone));
  outlineDiamond(c, cx, deckY, 34, 17, OUTLINE);
  fillDiamond(c, cx, deckY - 2, 30, 15, shade(hex(PIXEL_PALETTE.stone), 1.1));
  for (const dx of [-13, 0, 13]) c.fillRect(cx + dx, deckY - 16, 2, 14, hex(PIXEL_PALETTE.wood));
  const roofY = deckY - 16;
  const roof = drawHipRoof(c, cx, roofY, 38, 19, 9, hex(PIXEL_PALETTE.roof), OUTLINE);
  c.replaceInRect(
    cx,
    roofY - 14,
    W / 2,
    30,
    hex(PIXEL_PALETTE.roof),
    shade(hex(PIXEL_PALETTE.roof), 0.78),
  );
  c.fillRect(cx, roof.topY - 5, 1, 5, hex(PIXEL_PALETTE.goldDark));
  c.fillRect(cx - 1, roof.topY - 7, 3, 2, hex(PIXEL_PALETTE.gold));

  // Flower beds, three tones so they read as colour rather than noise.
  for (const [bx, by] of [
    [cx + 28, cy + 2],
    [cx - 28, cy - 6],
    [cx + 4, cy + 24],
  ] as const) {
    fillDiamond(c, bx, by, 16, 8, hex(PIXEL_PALETTE.wood));
    fillDiamond(c, bx, by, 13, 6, hex(PIXEL_PALETTE.leaf));
    for (let k = 0; k < 9; k += 1) {
      const petal = [PIXEL_PALETTE.gold, PIXEL_PALETTE.roof, PIXEL_PALETTE.roadLine][k % 3]!;
      c.fillRect(
        bx - 4 + Math.floor(random() * 9),
        by - 1 + Math.floor(random() * 3),
        1,
        1,
        hex(petal),
      );
    }
  }

  // Benches facing the walks.
  for (const [bx, by, flip] of [
    [cx - 34, cy + 2, 1],
    [cx + 16, cy + 18, -1],
    [cx + 30, cy - 10, -1],
  ] as const) {
    const seat = hex(PIXEL_PALETTE.wood);
    for (let i = 0; i < 4; i += 1) {
      c.fillRect(bx + i * 2 * flip, by + i * flip, 2, 1, seat);
      c.fillRect(bx + i * 2 * flip, by - 3 + i * flip, 2, 2, shade(seat, 1.15));
    }
    c.fillRect(bx, by + 1, 1, 2, OUTLINE);
    c.fillRect(bx + 6 * flip, by + 1 + 3 * flip, 1, 2, OUTLINE);
  }

  // Lamp posts and shade trees around the edge.
  for (const [lx, ly] of [
    [cx - 12, cy + 22],
    [cx + 26, cy - 8],
  ] as const) {
    c.fillRect(lx, ly - 14, 1, 14, hex(PIXEL_PALETTE.metalDark));
    c.fillRect(lx - 2, ly - 17, 4, 3, hex(PIXEL_PALETTE.metalDark));
    c.fillRect(lx - 1, ly - 16, 2, 2, hex(PIXEL_PALETTE.windowLit));
  }
  // Trunks stay inside the diamond and clear of the bandstand in the middle.
  for (const [tx, ty, radius] of [
    [cx - 46, cy - 4, 11],
    [cx + 46, cy + 2, 10],
    [cx - 40, cy + 6, 8],
    [cx + 32, cy - 14, 9],
  ] as const) {
    c.fillRect(tx, ty - 8, 2, 8, hex(PIXEL_PALETTE.wood));
    drawCanopy(c, tx, ty - 8 - radius + 2, radius + 2, radius, hex(PIXEL_PALETTE.leaf));
  }

  save(
    {
      id: "park_lv1",
      type: "decoration",
      file: "world/decorations/park_lv1.png",
      width: W,
      height: H,
      anchor: { x: cx, y: cy },
      footprint: { w: 2, h: 2 },
    },
    c,
  );
}

/** Pond that fills an empty stretch of lawn: banked edge, reeds, lily pads. */
function generatePond(): void {
  const H = TILE_H + 16;
  const c = new PixelCanvas(TILE_W, H);
  const cy = H - TILE_H / 2 - 1;
  const bank = hex(PIXEL_PALETTE.wood);
  const water = hex(PIXEL_PALETTE.water);
  const deep = hex(PIXEL_PALETTE.waterDark);
  const random = createSeededRandom(seedFromString("pond_lv1"));

  drawDiamond(c, 32, cy, TILE_W, TILE_H, hex(PIXEL_PALETTE.grass), OUTLINE);
  fillDiamond(c, 32, cy, TILE_W - 8, TILE_H - 4, shade(bank, 1.1));
  fillDiamond(c, 32, cy, TILE_W - 14, TILE_H - 7, water);
  outlineDiamond(c, 32, cy, TILE_W - 14, TILE_H - 7, shade(deep, 0.9));
  // Ripples, brightest where the light lands.
  const surface: IsoBox = { cx: 32, baseY: cy, w: TILE_W - 14, h: TILE_H - 7, height: 0 };
  for (let u = 2; u < faceSteps(surface) - 1; u += 3)
    fillFaceRect(c, surface, "left", u, 0, 2, 1, shade(water, 1.2));
  for (let k = 0; k < 8; k += 1) {
    const dy = Math.round((random() - 0.5) * (TILE_H - 14));
    const span = Math.max(0, (TILE_W - 20) / 2 - Math.abs(dy) * 2);
    const dx = Math.round((random() - 0.5) * span * 2);
    c.fillRect(32 + dx, cy + dy, 2, 1, deep);
  }
  // Lily pads and reeds on the near bank.
  for (const [px, py] of [
    [24, cy + 3],
    [41, cy - 2],
  ] as const) {
    fillDiamond(c, px, py, 7, 4, hex(PIXEL_PALETTE.leaf));
    c.fillRect(px, py - 1, 1, 1, hex(PIXEL_PALETTE.roadLine));
  }
  for (const [rx, ry] of [
    [12, cy + 2],
    [15, cy + 4],
    [52, cy - 1],
  ] as const) {
    c.fillRect(rx, ry - 7, 1, 7, hex(PIXEL_PALETTE.leafDark));
    c.fillRect(rx, ry - 8, 1, 2, hex(PIXEL_PALETTE.wood));
  }
  save(
    {
      id: "pond_lv1",
      type: "decoration",
      file: "world/decorations/pond_lv1.png",
      width: TILE_W,
      height: H,
      anchor: { x: 32, y: cy },
      footprint: { w: 1, h: 1 },
    },
    c,
  );
}

/** A fish, drawn swimming to the right; the renderer mirrors it to turn around. */
function generateFish(): void {
  const c = new PixelCanvas(12, 8);
  const body = hex(PIXEL_PALETTE.gold);
  const dark = shade(body, 0.78);
  c.fillRect(3, 3, 6, 3, body);
  c.fillRect(4, 2, 4, 1, body);
  c.fillRect(4, 6, 4, 1, dark);
  c.fillRect(3, 5, 6, 1, dark);
  // Tail fin and eye.
  c.fillRect(1, 2, 2, 1, body);
  c.fillRect(1, 5, 2, 1, body);
  c.fillRect(2, 3, 1, 2, dark);
  c.fillRect(8, 3, 1, 1, OUTLINE);
  save(
    {
      id: "fish_basic",
      type: "nature",
      file: "world/nature/fish_basic.png",
      width: 12,
      height: 8,
      anchor: { x: 6, y: 4 },
      footprint: { w: 1, h: 1 },
    },
    c,
  );
}

/**
 * Signpost planted in front of a building. The board is blank: the renderer
 * blits the asset label onto it from the font atlas, since the text is data.
 */
function generateSign(): void {
  signSprite("sign_board", SIGN_POST_H);
  signSprite("sign_board_high", SIGN_POST_H_HIGH);
}

/** One signpost. Two heights exist so neighbouring signs do not collide. */
function signSprite(id: string, postHeight: number): void {
  const c = new PixelCanvas(SIGN_W, SIGN_H);
  const post = hex(PIXEL_PALETTE.wood);
  const board = hex(PIXEL_PALETTE.wall);
  const boardY = signBoardY(postHeight);
  c.fillPolygon(
    [
      [SIGN_W / 2, SIGN_BASE_Y - 2],
      [SIGN_W / 2 + 10, SIGN_BASE_Y + 2],
      [SIGN_W / 2, SIGN_BASE_Y + 6],
      [SIGN_W / 2 - 10, SIGN_BASE_Y + 2],
    ],
    SHADOW,
  );
  // Two posts, then the board they carry.
  for (const dx of [-SIGN_BOARD_W / 2 + 3, SIGN_BOARD_W / 2 - 5] as const) {
    c.fillRect(SIGN_W / 2 + dx, SIGN_BASE_Y - postHeight, 2, postHeight + 1, OUTLINE);
    c.fillRect(SIGN_W / 2 + dx, SIGN_BASE_Y - postHeight, 1, postHeight, shade(post, 1.15));
  }
  c.fillRect(SIGN_BOARD_X - 1, boardY - 1, SIGN_BOARD_W + 2, SIGN_BOARD_H + 2, OUTLINE);
  c.fillRect(SIGN_BOARD_X, boardY, SIGN_BOARD_W, SIGN_BOARD_H, board);
  c.fillRect(SIGN_BOARD_X, boardY, SIGN_BOARD_W, 1, shade(board, 1.12));
  c.fillRect(SIGN_BOARD_X, boardY + SIGN_BOARD_H - 1, SIGN_BOARD_W, 1, shade(board, 0.84));
  save(
    {
      id,
      type: "ui",
      file: `ui/${id}.png`,
      width: SIGN_W,
      height: SIGN_H,
      anchor: { x: SIGN_W / 2, y: SIGN_BASE_Y },
      footprint: { w: 1, h: 1 },
    },
    c,
  );
}

/**
 * Cars. The four orientations are the reference art supplied by the product
 * owner, reduced to the pixel grid in `lib/car-sprite-data` and blitted here;
 * nothing about the shape is procedural any more. The generator's job is to
 * lay the ground shadow, recolour the body, and register the sprite.
 */
function carSprite(colour: CarColour, heading: CarHeading): void {
  const art = CAR_SPRITES[heading];
  const palette = carPalette(colour);
  // A few rows of apron below the art so the ground shadow is not clipped.
  const H = art.height + CAR_SHADOW_APRON;
  const c = new PixelCanvas(art.width, H);

  c.fillPolygon(
    diamond(art.anchor.x, art.anchor.y, CAR_SHADOW_W, CAR_SHADOW_H),
    SHADOW,
  );

  art.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const ch = row[x]!;
      if (ch === ".") continue;
      c.set(x, y, palette[Number.parseInt(ch, 16)]!);
    }
  });

  save(
    {
      id: carSpriteId(colour, heading),
      type: "decoration",
      file: `world/vehicles/${carSpriteId(colour, heading)}.png`,
      width: art.width,
      height: H,
      anchor: { x: art.anchor.x, y: art.anchor.y },
      footprint: { w: 1, h: 1 },
      placeholder: false,
    },
    c,
  );
}

/**
 * Colour variants of the one car. Only the body swatches are rotated: the
 * glazing, wheels, lamps and outline are the same parts on every car, and
 * rotating them turned the windows green.
 */
function carPalette(colour: CarColour): RGBA[] {
  const rotation = CAR_BODY_ROTATION[colour];
  return CAR_PALETTE.map((swatch, index) => {
    const rgba = hex(swatch);
    if (!rotation || !CAR_BODY_SWATCHES.includes(index as (typeof CAR_BODY_SWATCHES)[number]))
      return rgba;
    return rotateHue(rgba, rotation.degrees, rotation.saturation);
  });
}

/** Hue rotation at constant lightness, so the body keeps its modelling. */
function rotateHue(rgba: RGBA, degrees: number, saturationFactor: number): RGBA {
  const [r, g, b, a] = rgba;
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const lightness = (max + min) / 2;
  const delta = max - min;
  let hue = 0;
  if (delta > 0) {
    const [R, G, B] = [r / 255, g / 255, b / 255];
    hue =
      max === R ? ((G - B) / delta) % 6 : max === G ? (B - R) / delta + 2 : (R - G) / delta + 4;
    hue *= 60;
  }
  hue = (hue + degrees + 360) % 360;
  const saturation = Math.min(
    1,
    (delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1))) * saturationFactor,
  );
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const second = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const offset = lightness - chroma / 2;
  const [R, G, B] =
    hue < 60
      ? [chroma, second, 0]
      : hue < 120
        ? [second, chroma, 0]
        : hue < 180
          ? [0, chroma, second]
          : hue < 240
            ? [0, second, chroma]
            : hue < 300
              ? [second, 0, chroma]
              : [chroma, 0, second];
  return [
    Math.round((R + offset) * 255),
    Math.round((G + offset) * 255),
    Math.round((B + offset) * 255),
    a,
  ];
}

function generateVehicles(): void {
  for (const colour of CAR_COLOURS) for (const heading of CAR_HEADINGS) carSprite(colour, heading);
}

/**
 * Application icon: the little house of the world, drawn to read at 32x32 and
 * still at 16x16 once the browser halves it. Written to `src/app/icon.png` as
 * well, which is where the App Router picks up the favicon.
 */
function generateAppIcon(): void {
  const SIZE = 32;
  const c = new PixelCanvas(SIZE, SIZE);
  const cx = SIZE / 2;
  const baseY = 25;
  const box: IsoBox = { cx, baseY, w: 24, h: 12, height: 10 };
  const wall = hex(PIXEL_PALETTE.wall);
  const tile = hex(PIXEL_PALETTE.roof);

  // Ground shadow, then the walls.
  c.fillPolygon(
    [
      [cx + 1, baseY + 1],
      [cx + 13, baseY + 7],
      [cx + 1, baseY + 13],
      [cx - 11, baseY + 7],
    ],
    hex(PIXEL_PALETTE.grassDark),
  );
  drawIsoBox(c, box, { base: wall, outline: OUTLINE });
  // A lit window on each face, and the door on the front one.
  fillFaceRect(c, box, "left", 1, 5, 1, 3, hex(PIXEL_PALETTE.windowLit));
  fillFaceRect(c, box, "right", 4, 5, 1, 3, shade(hex(PIXEL_PALETTE.windowLit), 0.85));
  fillFaceRect(c, box, "left", 3, 1, 2, 6, hex(PIXEL_PALETTE.wood));
  fillFaceRect(c, box, "left", 4, 4, 1, 1, hex(PIXEL_PALETTE.gold));
  // Hip roof with the right slope in shadow, and a chimney.
  const roofY = baseY - box.height;
  drawHipRoof(c, cx, roofY, 28, 14, 6, tile, OUTLINE);
  c.replaceInRect(cx, roofY - 10, 16, 26, tile, shade(tile, 0.76));
  const chimney: IsoBox = { cx: cx + 6, baseY: roofY - 3, w: 4, h: 2, height: 5 };
  drawIsoBox(c, chimney, { base: hex(PIXEL_PALETTE.brickDark), outline: OUTLINE });

  save(
    {
      id: "icon_house",
      type: "ui",
      file: "ui/icon_house.png",
      width: SIZE,
      height: SIZE,
      anchor: { x: cx, y: baseY },
    },
    c,
  );
  // The App Router serves the favicon from this exact path.
  const icon = path.join(process.cwd(), "src", "app", "icon.png");
  mkdirSync(path.dirname(icon), { recursive: true });
  writeFileSync(icon, c.toPng());
}

/** Glyph atlas for in-world signs; framed by index at render time. */
function generateFont(): void {
  const atlas = buildFontAtlas(hex(PIXEL_PALETTE.outline));
  save(
    {
      id: "font_5x7",
      type: "ui",
      file: "ui/font_5x7.png",
      width: atlas.width,
      height: atlas.height,
      anchor: { x: 0, y: 0 },
    },
    atlas,
  );
}

function generateCharacter(): void {
  const c = new PixelCanvas(16, 32);
  const skin = hex(PIXEL_PALETTE.skin);
  const shirt = hex(PIXEL_PALETTE.glassDark);
  const pants = hex(PIXEL_PALETTE.outline);
  c.fillPolygon(diamond(9, 29, 12, 6), SHADOW);
  c.fillRect(5, 6, 6, 6, skin);
  c.fillRect(4, 5, 8, 2, hex(PIXEL_PALETTE.wood));
  c.fillRect(4, 12, 8, 9, shirt);
  c.fillRect(5, 21, 3, 7, pants);
  c.fillRect(9, 21, 3, 7, pants);
  c.line(4, 12, 4, 27, OUTLINE);
  c.line(11, 12, 11, 27, OUTLINE);
  save(
    {
      id: "character_basic",
      type: "character",
      file: "world/characters/character_basic.png",
      width: 16,
      height: 32,
      anchor: { x: 8, y: 28 },
      footprint: { w: 1, h: 1 },
    },
    c,
  );
}

function generateEffects(): void {
  for (const size of [1, 2]) {
    const w = TILE_W * size;
    const h = TILE_H * size;
    const c = new PixelCanvas(w + 4, h + 4);
    const pts = diamond(w / 2 + 2, h / 2 + 2, w + 2, h + 2);
    const color = hex(PIXEL_PALETTE.selection);
    for (let i = 0; i < 4; i += 1) {
      const a = pts[i]!;
      const b = pts[(i + 1) % 4]!;
      c.line(a[0], a[1], b[0], b[1], color);
      c.line(a[0], a[1] + 1, b[0], b[1] + 1, color);
    }
    save(
      {
        id: size === 1 ? "selection_ring" : "selection_ring_2x2",
        type: "ui",
        file: `ui/selection_ring_${size}x${size}.png`,
        width: c.width,
        height: c.height,
        anchor: { x: w / 2 + 2, y: h / 2 + 2 },
        footprint: { w: size, h: size },
      },
      c,
    );
  }
}

function main(): void {
  generateTerrain();
  for (const [kind, style] of Object.entries(STYLES))
    for (let level = 1; level <= 5; level += 1) generateBuilding(kind, style, level);
  generateNature();
  generateFish();
  generateSign();
  generateFont();
  generateAppIcon();
  generateVehicles();
  generateCharacter();
  generateEffects();
  const manifest = {
    version: 1,
    basePath: "/assets/",
    tile: { width: TILE_W, height: TILE_H },
    assets: entries,
  };
  writeFileSync(
    path.join(OUT_DIR, "asset-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log(`${entries.length} placeholder sprites generated.`);
  const sheet = process.env.CONTACT_SHEET;
  if (sheet) {
    const only = process.env.CONTACT_SHEET_IDS;
    const scale = Number(process.env.CONTACT_SHEET_SCALE ?? 2);
    if (only) {
      writeContactSheet(sheet, only.split(","), scale);
      return;
    }
    writeContactSheet(sheet, [
      "terrain_grass",
      "terrain_water",
      "road_cross",
      "house_lv1",
      "house_lv3",
      "house_lv5",
      "apartment_lv2",
      "apartment_lv5",
      "bank_lv2",
      "bank_lv4",
      "vault_lv3",
      "financial_lv3",
      "financial_lv5",
      "market_lv2",
      "realestate_lv3",
      "warehouse_lv2",
      "tree_basic",
      "tree_small",
      "park_lv1",
      "character_basic",
      "selection_ring",
    ]);
  }
}

main();
