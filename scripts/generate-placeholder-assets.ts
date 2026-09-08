import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PIXEL_PALETTE } from "../src/config/pixel-palette";
import { PixelCanvas, hex, shade, type RGBA } from "./lib/png";

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
const SHADOW = hex(PIXEL_PALETTE.shadow, 90);

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
  placeholder: true;
}

const entries: ManifestEntry[] = [];
const canvases = new Map<string, PixelCanvas>();

function save(entry: Omit<ManifestEntry, "placeholder">, canvas: PixelCanvas): void {
  const file = path.join(OUT_DIR, entry.file);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, canvas.toPng());
  entries.push({ ...entry, placeholder: true });
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

/**
 * Isometric box standing on a diamond base of size (w, h) whose centre is at
 * (cx, baseY). Left face = base colour, right face = -18 %, top = +12 %.
 */
function drawBox(
  c: PixelCanvas,
  cx: number,
  baseY: number,
  w: number,
  h: number,
  height: number,
  base: RGBA,
  topColor?: RGBA,
): void {
  const left: [number, number] = [cx - w / 2, baseY];
  const right: [number, number] = [cx + w / 2, baseY];
  const bottom: [number, number] = [cx, baseY + h / 2];
  const up = (p: [number, number]): [number, number] => [p[0], p[1] - height];
  c.fillPolygon([left, bottom, up(bottom), up(left)], base);
  c.fillPolygon([bottom, right, up(right), up(bottom)], shade(base, 0.82));
  drawDiamond(c, cx, baseY - height, w, h, topColor ?? shade(base, 1.12), null);
  // Outlines: vertical edges and top diamond.
  c.line(left[0], left[1], left[0], left[1] - height, OUTLINE);
  c.line(right[0], right[1], right[0], right[1] - height, OUTLINE);
  c.line(bottom[0], bottom[1], bottom[0], bottom[1] - height, OUTLINE);
  c.line(left[0], left[1], bottom[0], bottom[1], OUTLINE);
  c.line(bottom[0], bottom[1], right[0], right[1], OUTLINE);
  const top = diamond(cx, baseY - height, w, h);
  for (let i = 0; i < 4; i += 1) {
    const a = top[i]!;
    const b = top[(i + 1) % 4]!;
    c.line(a[0], a[1], b[0], b[1], OUTLINE);
  }
}

/** Windows on the left (x < cx) or right face, following the face slope (h/w per px). */
function drawWindows(
  c: PixelCanvas,
  cx: number,
  baseY: number,
  w: number,
  h: number,
  height: number,
  rows: number,
  cols: number,
  color: RGBA,
): void {
  const slope = h / w; // vertical drop per horizontal pixel along a face edge
  const faceW = w / 2;
  for (const side of [-1, 1] as const) {
    for (let r = 0; r < rows; r += 1) {
      for (let col = 0; col < cols; col += 1) {
        const offset = 6 + ((col + 0.5) * (faceW - 12)) / cols;
        const x = side === -1 ? cx - faceW + offset : cx + offset;
        const yBase = side === -1 ? baseY + offset * slope : baseY + (faceW - offset) * slope;
        const y = Math.round(yBase - height + 6 + r * ((height - 10) / rows));
        c.fillRect(Math.round(x), y, 3, 4, color);
      }
    }
  }
}

function drawShadow(c: PixelCanvas, cx: number, baseY: number, w: number, h: number): void {
  c.fillPolygon(diamond(cx + 4, baseY + 3, w, h), SHADOW);
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

function generateTerrain(): void {
  terrainTile(PIXEL_PALETTE.grass, "terrain_grass", "world/terrain/terrain_grass.png", (c) => {
    const dark = hex(PIXEL_PALETTE.grassDark);
    for (const [x, y] of [
      [20, 14],
      [40, 10],
      [30, 22],
      [46, 18],
      [14, 18],
    ] as const)
      c.fillRect(x, y, 2, 1, dark);
  });
  terrainTile(PIXEL_PALETTE.water, "terrain_water", "world/terrain/terrain_water.png", (c) => {
    const dark = hex(PIXEL_PALETTE.waterDark);
    c.fillRect(22, 12, 6, 1, dark);
    c.fillRect(36, 18, 6, 1, dark);
    c.fillRect(28, 22, 4, 1, dark);
  });
  const line = hex(PIXEL_PALETTE.roadLine);
  terrainTile(PIXEL_PALETTE.road, "road_ns", "world/roads/road_ns.png", (c) => {
    for (let i = 0; i < 4; i += 1) c.fillRect(24 + i * 6, 12 + i * 3, 3, 1, line);
  });
  terrainTile(PIXEL_PALETTE.road, "road_ew", "world/roads/road_ew.png", (c) => {
    for (let i = 0; i < 4; i += 1) c.fillRect(24 + i * 6, 20 - i * 3, 3, 1, line);
  });
  terrainTile(PIXEL_PALETTE.road, "road_cross", "world/roads/road_cross.png", (c) => {
    c.fillRect(31, 15, 2, 2, line);
  });
}

interface BuildingStyle {
  base: string;
  top?: string;
  windows?: string;
  roof?: boolean;
  columns?: boolean;
  trim?: string;
  heights: [number, number, number, number, number];
}

const STYLES: Record<string, BuildingStyle> = {
  house: {
    base: PIXEL_PALETTE.wall,
    windows: PIXEL_PALETTE.glassDark,
    roof: true,
    heights: [18, 22, 26, 30, 36],
  },
  apartment: {
    base: PIXEL_PALETTE.brick,
    windows: PIXEL_PALETTE.glass,
    heights: [32, 44, 56, 64, 84],
  },
  bank: {
    base: PIXEL_PALETTE.stone,
    columns: true,
    trim: PIXEL_PALETTE.gold,
    heights: [24, 30, 36, 44, 56],
  },
  vault: { base: PIXEL_PALETTE.stoneDark, trim: PIXEL_PALETTE.gold, heights: [18, 22, 26, 32, 40] },
  financial: {
    base: PIXEL_PALETTE.glass,
    windows: PIXEL_PALETTE.roadLine,
    heights: [40, 56, 72, 88, 112],
  },
  market: {
    base: PIXEL_PALETTE.glassDark,
    windows: PIXEL_PALETTE.roadLine,
    trim: PIXEL_PALETTE.gold,
    heights: [28, 36, 48, 60, 76],
  },
  realestate: {
    base: PIXEL_PALETTE.brickDark,
    windows: PIXEL_PALETTE.glass,
    heights: [30, 40, 52, 64, 80],
  },
  warehouse: { base: PIXEL_PALETTE.wood, heights: [16, 20, 24, 30, 36] },
};

const CATEGORY_OF: Record<string, string> = {
  house: "real_estate",
  apartment: "real_estate",
  bank: "cash",
  vault: "cash",
  financial: "financial",
  market: "financial",
  realestate: "real_estate",
  warehouse: "alternative",
};

function generateBuilding(kind: string, style: BuildingStyle, level: number): void {
  const footprint = kind === "house" || level < 4 ? 1 : 2;
  const w = TILE_W * footprint;
  const h = TILE_H * footprint;
  const height = style.heights[level - 1]!;
  const roofExtra = style.roof ? 10 : 0;
  const canvasH = h + height + roofExtra + 8;
  const c = new PixelCanvas(w + 8, canvasH);
  const cx = w / 2 + 4;
  const baseY = canvasH - h / 2 - 4;
  drawShadow(c, cx, baseY, w, h);
  const base = hex(style.base);
  drawBox(c, cx, baseY, w, h, height, base);
  if (style.windows)
    drawWindows(
      c,
      cx,
      baseY,
      w,
      h,
      height,
      Math.max(1, Math.floor(height / 14)),
      footprint === 2 ? 3 : 2,
      hex(style.windows),
    );
  if (style.columns) {
    const col = shade(base, 1.08);
    for (let i = 1; i < 4; i += 1) {
      const x = Math.round(cx - w / 2 + (i * w) / 8);
      c.fillRect(x, Math.round(baseY - height + 4 + (i * h) / 8), 2, height - 6, col);
    }
  }
  if (style.trim) {
    const trim = hex(style.trim);
    const top = diamond(cx, baseY - height, w, h);
    c.line(top[3]![0], top[3]![1] + 1, top[2]![0], top[2]![1] + 1, trim);
    c.line(top[2]![0], top[2]![1] + 1, top[1]![0], top[1]![1] + 1, trim);
    if (kind === "vault") c.fillRect(cx - 6, Math.round(baseY - height / 2), 4, 4, trim);
  }
  if (style.roof) {
    // Pitched roof: a smaller darker box on top, red palette, with a ridge.
    const roof = hex(PIXEL_PALETTE.roof);
    drawBox(c, cx, baseY - height, w - 8, h - 4, roofExtra, roof, shade(roof, 1.12));
    c.line(
      cx - 2,
      baseY - height - roofExtra - 1,
      cx + 2,
      baseY - height - roofExtra - 1,
      hex(PIXEL_PALETTE.roofDark),
    );
    // Door on the left face.
    c.fillRect(cx - 12, baseY - 8 + 6, 4, 7, hex(PIXEL_PALETTE.wood));
  }
  const id = `${kind}_lv${level}`;
  save(
    {
      id,
      type: "building",
      category: CATEGORY_OF[kind],
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

  const park = new PixelCanvas(TILE_W, TILE_H + 16);
  drawDiamond(park, 32, 32, TILE_W, TILE_H, hex(PIXEL_PALETTE.grassDark), OUTLINE);
  park.fillRect(30, 26, 4, 1, hex(PIXEL_PALETTE.roadLine));
  park.fillRect(26, 34, 12, 1, hex(PIXEL_PALETTE.roadLine));
  drawCanopy(park, 22, 22, 7, 5, hex(PIXEL_PALETTE.leaf));
  drawCanopy(park, 44, 26, 6, 4, hex(PIXEL_PALETTE.leaf));
  save(
    {
      id: "park_lv1",
      type: "decoration",
      file: "world/decorations/park_lv1.png",
      width: TILE_W,
      height: TILE_H + 16,
      anchor: { x: 32, y: 32 },
      footprint: { w: 1, h: 1 },
    },
    park,
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
  // Scaffolding overlay for buildings carrying a linked debt: thin wooden frame.
  const s = new PixelCanvas(TILE_W, 64);
  const wood = hex(PIXEL_PALETTE.wood);
  for (const x of [4, 20, 44, 60]) s.fillRect(x, 8, 1, 48, wood);
  for (const y of [14, 30, 46]) s.fillRect(4, y, 57, 1, wood);
  save(
    {
      id: "scaffold",
      type: "effect",
      file: "world/effects/scaffold.png",
      width: TILE_W,
      height: 64,
      anchor: { x: 32, y: 48 },
      footprint: { w: 1, h: 1 },
    },
    s,
  );
}

function main(): void {
  generateTerrain();
  for (const [kind, style] of Object.entries(STYLES))
    for (let level = 1; level <= 5; level += 1) generateBuilding(kind, style, level);
  generateNature();
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
      "scaffold",
      "selection_ring",
    ]);
  }
}

main();
