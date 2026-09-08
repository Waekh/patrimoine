import { deflateSync } from "node:zlib";

/** Minimal RGBA canvas with a PNG encoder (no dependency, no anti-aliasing). */
export class PixelCanvas {
  readonly data: Uint8Array;
  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8Array(width * height * 4);
  }

  set(x: number, y: number, rgba: [number, number, number, number]): void {
    // Coordinates must land on a pixel: a fractional index silently addresses
    // the wrong row on a Uint8Array, which shows up as smeared artefacts.
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= this.width || py >= this.height) return;
    const i = (py * this.width + px) * 4;
    const [r, g, b, a] = rgba;
    if (a >= 255) {
      this.data[i] = r;
      this.data[i + 1] = g;
      this.data[i + 2] = b;
      this.data[i + 3] = 255;
      return;
    }
    // Alpha blending only for deliberate translucent overlays (shadows); pixels stay crisp.
    const da = this.data[i + 3]! / 255;
    const sa = a / 255;
    const oa = sa + da * (1 - sa);
    if (oa === 0) return;
    this.data[i] = Math.round((r * sa + this.data[i]! * da * (1 - sa)) / oa);
    this.data[i + 1] = Math.round((g * sa + this.data[i + 1]! * da * (1 - sa)) / oa);
    this.data[i + 2] = Math.round((b * sa + this.data[i + 2]! * da * (1 - sa)) / oa);
    this.data[i + 3] = Math.round(oa * 255);
  }

  /** Scanline fill of a polygon (even-odd rule); vertices may be fractional. */
  fillPolygon(points: Array<[number, number]>, rgba: [number, number, number, number]): void {
    const ys = points.map((p) => p[1]);
    const minY = Math.max(0, Math.ceil(Math.min(...ys)));
    const maxY = Math.min(this.height - 1, Math.floor(Math.max(...ys)));
    for (let y = minY; y <= maxY; y += 1) {
      const xs: number[] = [];
      for (let i = 0; i < points.length; i += 1) {
        const [x1, y1] = points[i]!;
        const [x2, y2] = points[(i + 1) % points.length]!;
        if (y1 === y2) continue;
        const [ax, ay, bx, by] = y1 < y2 ? [x1, y1, x2, y2] : [x2, y2, x1, y1];
        if (y < ay || y >= by) continue;
        xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const start = Math.round(xs[i]!);
        const end = Math.round(xs[i + 1]!);
        for (let x = start; x < end; x += 1) this.set(x, y, rgba);
      }
    }
  }

  fillRect(
    x: number,
    y: number,
    w: number,
    h: number,
    rgba: [number, number, number, number],
  ): void {
    for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) this.set(x + i, y + j, rgba);
  }

  /** Bresenham line, 1 px wide. Endpoints are rounded so the walk always terminates. */
  line(
    px0: number,
    py0: number,
    px1: number,
    py1: number,
    rgba: [number, number, number, number],
  ): void {
    const x0 = Math.round(px0);
    const y0 = Math.round(py0);
    const x1 = Math.round(px1);
    const y1 = Math.round(py1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      this.set(x, y, rgba);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /** Replaces one exact colour by another inside a rectangle. */
  replaceInRect(x0: number, y0: number, w: number, h: number, from: RGBA, to: RGBA): void {
    for (let y = y0; y < y0 + h; y += 1) {
      for (let x = x0; x < x0 + w; x += 1) {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) continue;
        const i = (y * this.width + x) * 4;
        if (
          this.data[i] === from[0] &&
          this.data[i + 1] === from[1] &&
          this.data[i + 2] === from[2] &&
          this.data[i + 3] === from[3]
        ) {
          this.data[i] = to[0];
          this.data[i + 1] = to[1];
          this.data[i + 2] = to[2];
          this.data[i + 3] = to[3];
        }
      }
    }
  }

  toPng(): Buffer {
    const raw = Buffer.alloc((this.width * 4 + 1) * this.height);
    for (let y = 0; y < this.height; y += 1) {
      raw[y * (this.width * 4 + 1)] = 0;
      Buffer.from(this.data.buffer, y * this.width * 4, this.width * 4).copy(
        raw,
        y * (this.width * 4 + 1) + 1,
      );
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.width, 0);
    ihdr.writeUInt32BE(this.height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // RGBA
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(raw, { level: 9 })),
      chunk("IEND", Buffer.alloc(0)),
    ]);
  }
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

export type RGBA = [number, number, number, number];

export function hex(color: string, alpha = 255): RGBA {
  const n = Number.parseInt(color.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha];
}

/** Multiplies luminance; factor 0.82 = -18 %, 1.12 = +12 %. */
export function shade(color: RGBA, factor: number): RGBA {
  return [clamp(color[0] * factor), clamp(color[1] * factor), clamp(color[2] * factor), color[3]];
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}
