import { describe, expect, it } from "vitest";
import { tooltipPosition } from "./building-tooltip";

const bounds = { width: 1000, height: 600 };

describe("bulle de survol", () => {
  it("se place en bas à droite du pointeur quand la place suffit", () => {
    const { left, top } = tooltipPosition(200, 200, bounds);
    expect(left).toBeGreaterThan(200);
    expect(top).toBeGreaterThan(200);
  });

  it("bascule de l'autre côté du pointeur près d'un bord", () => {
    const near = tooltipPosition(bounds.width - 20, bounds.height - 20, bounds);
    expect(near.left).toBeLessThan(bounds.width - 20);
    expect(near.top).toBeLessThan(bounds.height - 20);
  });

  it("ne sort jamais de la scène, même dans un coin", () => {
    for (const [x, y] of [
      [0, 0],
      [bounds.width, bounds.height],
      [0, bounds.height],
      [bounds.width, 0],
    ] as const) {
      const { left, top } = tooltipPosition(x, y, bounds);
      expect(left).toBeGreaterThanOrEqual(0);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(left).toBeLessThanOrEqual(bounds.width);
      expect(top).toBeLessThanOrEqual(bounds.height);
    }
  });
});
