import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CAR_COLOURS, CAR_HEADINGS, carSpriteId, headingBetween } from "./sprites";

describe("sens de circulation", () => {
  it.each([
    [{ x: 4, y: 4 }, { x: 9, y: 4 }, "east"],
    [{ x: 9, y: 4 }, { x: 0, y: 4 }, "west"],
    [{ x: 4, y: 1 }, { x: 4, y: 8 }, "south"],
    [{ x: 4, y: 8 }, { x: 4, y: 0 }, "north"],
  ])("lit le sens de %j vers %j", (from, to, expected) => {
    expect(headingBetween(from, to)).toBe(expected);
  });
});

/**
 * The sprite ids are built in this module and the files are written by the
 * asset generator: nothing checks the two agree at compile time, so a rename on
 * either side has to fail here rather than in a blank spot on the map.
 */
describe("catalogue des voitures", () => {
  const manifest = JSON.parse(
    readFileSync(path.join(process.cwd(), "public", "assets", "asset-manifest.json"), "utf8"),
  ) as { assets: Array<{ id: string; width: number; height: number }> };
  const byId = new Map(manifest.assets.map((a) => [a.id, a]));

  it.each(CAR_COLOURS.flatMap((c) => CAR_HEADINGS.map((h) => [c, h] as const)))(
    "publie le sprite %s %s",
    (colour, heading) => {
      expect(byId.get(carSpriteId(colour, heading))).toBeDefined();
    },
  );

  it("garde la même taille de voiture dans les trois teintes", () => {
    for (const heading of CAR_HEADINGS) {
      const sizes = CAR_COLOURS.map((colour) => {
        const entry = byId.get(carSpriteId(colour, heading))!;
        return `${entry.width}x${entry.height}`;
      });
      expect(new Set(sizes).size, heading).toBe(1);
    }
  });
});
