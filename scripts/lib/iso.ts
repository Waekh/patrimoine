import { shade, type PixelCanvas, type RGBA } from "./png";

/**
 * Isometric drawing toolkit. Details are placed in *face coordinates* so they
 * follow the 2:1 slope of the projection, which is what separates 16-bit
 * isometric art from flat rectangles pasted on a shape.
 *
 * A face step is 2 px horizontally and 1 px vertically, the slope of the
 * projection. `u` counts steps along the face, `v` counts pixels upwards from
 * the ground edge.
 */
export interface IsoBox {
  /** Centre of the base diamond. */
  cx: number;
  baseY: number;
  /** Base diamond size, always 2:1. */
  w: number;
  h: number;
  /** Vertical extrusion in pixels. */
  height: number;
}

export type Face = "left" | "right";

export function faceSteps(box: IsoBox): number {
  return Math.floor(box.w / 4);
}

export function faceOrigin(box: IsoBox, face: Face, step: number): { x: number; y: number } {
  const halfWidth = box.w / 2;
  const halfHeight = box.h / 2;
  return face === "left"
    ? { x: box.cx - halfWidth + 2 * step, y: box.baseY + step }
    : { x: box.cx + 2 * step, y: box.baseY + halfHeight - step };
}

export function diamondPoints(
  cx: number,
  cy: number,
  w: number,
  h: number,
): Array<[number, number]> {
  return [
    [cx, cy - h / 2],
    [cx + w / 2, cy],
    [cx, cy + h / 2],
    [cx - w / 2, cy],
  ];
}

export function outlineDiamond(
  c: PixelCanvas,
  cx: number,
  cy: number,
  w: number,
  h: number,
  color: RGBA,
): void {
  const points = diamondPoints(cx, cy, w, h);
  for (let i = 0; i < 4; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % 4]!;
    c.line(a[0], a[1], b[0], b[1], color);
  }
}

export function fillDiamond(
  c: PixelCanvas,
  cx: number,
  cy: number,
  w: number,
  h: number,
  color: RGBA,
): void {
  c.fillPolygon(diamondPoints(cx, cy, w, h), color);
}

export interface FaceRectOptions {
  /** Checkerboard instead of a solid fill, the 16-bit way to blend two tones. */
  dither?: boolean;
  /** Skip one step out of `every`, for ribs and mullions. */
  every?: number;
}

/** Fills a rectangle expressed in face coordinates, following the face slope. */
export function fillFaceRect(
  c: PixelCanvas,
  box: IsoBox,
  face: Face,
  u: number,
  v: number,
  du: number,
  dv: number,
  color: RGBA,
  options: FaceRectOptions = {},
): void {
  const steps = faceSteps(box);
  for (let i = u; i < u + du; i += 1) {
    if (i < 0 || i >= steps) continue;
    if (options.every && i % options.every !== 0) continue;
    const origin = faceOrigin(box, face, i);
    for (let k = 0; k < dv; k += 1) {
      const y = origin.y - v - k;
      if (y <= origin.y - box.height) continue;
      if (options.dither && (i + k) % 2 === 0) continue;
      c.fillRect(origin.x, y, 2, 1, color);
    }
  }
}

/** Horizontal band across a whole face: cornice, string course, plinth top. */
export function faceBand(
  c: PixelCanvas,
  box: IsoBox,
  face: Face,
  v: number,
  thickness: number,
  color: RGBA,
  options: FaceRectOptions = {},
): void {
  fillFaceRect(c, box, face, 0, v, faceSteps(box), thickness, color, options);
}

export interface BoxColors {
  /** Left face, lit from the top left. */
  base: RGBA;
  /** Defaults to base darkened, and top to base lightened. */
  right?: RGBA;
  top?: RGBA;
  outline: RGBA;
}

/** Draws the three visible faces of a box, with outlined silhouette. */
export function drawIsoBox(c: PixelCanvas, box: IsoBox, colors: BoxColors): void {
  const halfWidth = box.w / 2;
  const halfHeight = box.h / 2;
  const left: [number, number] = [box.cx - halfWidth, box.baseY];
  const bottom: [number, number] = [box.cx, box.baseY + halfHeight];
  const right: [number, number] = [box.cx + halfWidth, box.baseY];
  const up = (p: [number, number]): [number, number] => [p[0], p[1] - box.height];

  c.fillPolygon([left, bottom, up(bottom), up(left)], colors.base);
  c.fillPolygon([bottom, right, up(right), up(bottom)], colors.right ?? shade(colors.base, 0.82));
  fillDiamond(
    c,
    box.cx,
    box.baseY - box.height,
    box.w,
    box.h,
    colors.top ?? shade(colors.base, 1.14),
  );

  // Silhouette and the vertical corner, which reads as the building's edge.
  c.line(left[0], left[1], left[0], left[1] - box.height, colors.outline);
  c.line(right[0], right[1], right[0], right[1] - box.height, colors.outline);
  c.line(bottom[0], bottom[1], bottom[0], bottom[1] - box.height, colors.outline);
  c.line(left[0], left[1], bottom[0], bottom[1], colors.outline);
  c.line(bottom[0], bottom[1], right[0], right[1], colors.outline);
  outlineDiamond(c, box.cx, box.baseY - box.height, box.w, box.h, colors.outline);
}

/** Ground shadow, offset towards the bottom right like every other shadow. */
export function drawGroundShadow(c: PixelCanvas, box: IsoBox, color: RGBA): void {
  c.fillPolygon(diamondPoints(box.cx + 4, box.baseY + 3, box.w, box.h), color);
}

/** Ellipse in face coordinates: a round door or porthole on a wall. */
export function fillFaceEllipse(
  c: PixelCanvas,
  box: IsoBox,
  face: Face,
  u: number,
  v: number,
  ru: number,
  rv: number,
  color: RGBA,
  options: FaceRectOptions = {},
): void {
  for (let dv = -rv; dv <= rv; dv += 1) {
    const halfWidth = Math.round(ru * Math.sqrt(Math.max(0, 1 - (dv / rv) ** 2)));
    if (halfWidth < 0) continue;
    fillFaceRect(c, box, face, u - halfWidth, v + dv, halfWidth * 2 + 1, 1, color, options);
  }
}

/**
 * Hip roof drawn as stacked diamonds shrinking by one pixel of height per
 * course, the usual way to slope a roof in isometric pixel art.
 */
export function drawHipRoof(
  c: PixelCanvas,
  cx: number,
  baseY: number,
  w: number,
  h: number,
  courses: number,
  color: RGBA,
  outline: RGBA,
): { topY: number; topW: number; topH: number } {
  let width = w;
  let height = h;
  let y = baseY;
  // One pixel of rise per course while the diamond loses 2 px of width keeps
  // the slope at the 2:1 ratio of the projection, so the roof reads as pitched.
  for (let step = 0; step <= courses && width > 6 && height > 3; step += 1) {
    fillDiamond(c, cx, y, width, height, color);
    // A darker course line every third row reads as tiling.
    if (step % 3 === 0) outlineDiamond(c, cx, y, width, height, shade(color, 0.86));
    y -= 1;
    width -= 2;
    height -= 1;
  }
  outlineDiamond(c, cx, y + 1, width + 2, height + 1, outline);
  return { topY: y + 1, topW: width + 2, topH: height + 1 };
}
