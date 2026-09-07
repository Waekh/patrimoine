import { describe, expect, it } from "vitest";
import { footprintCenter, gridToScreen, screenToGrid } from "./iso";

describe("iso projection", () => {
  it("projects the origin and axes", () => {
    expect(gridToScreen({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(gridToScreen({ x: 1, y: 0 })).toEqual({ x: 32, y: 16 });
    expect(gridToScreen({ x: 0, y: 1 })).toEqual({ x: -32, y: 16 });
  });
  it("inverts", () => {
    const p = gridToScreen({ x: 7, y: 3 });
    expect(screenToGrid(p)).toEqual({ x: 7, y: 3 });
  });
  it("centres a 2x2 footprint", () => {
    expect(footprintCenter({ x: 2, y: 2 }, { w: 2, h: 2 })).toEqual(
      gridToScreen({ x: 2.5, y: 2.5 }),
    );
  });
});
