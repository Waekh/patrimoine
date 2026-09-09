import { describe, expect, it } from "vitest";
import {
  CHARSET,
  SIGN_LINES,
  SIGN_TEXT_W,
  atlasFrame,
  glyphIndex,
  measureLabel,
  normaliseLabel,
  truncateLabel,
  wrapLabel,
} from "./pixel-font";

describe("pixel font", () => {
  it("indexes every character of the charset exactly once", () => {
    expect(new Set(CHARSET).size).toBe(CHARSET.length);
    [...CHARSET].forEach((char, index) => expect(glyphIndex(char)).toBe(index));
  });

  it("lays glyphs out on a grid without overlapping cells", () => {
    const first = atlasFrame(0);
    const second = atlasFrame(1);
    expect(first).toEqual({ x: 0, y: 0 });
    expect(second.y).toBe(0);
    expect(second.x).toBeGreaterThan(first.x);
  });

  it("folds a label to what the atlas can draw", () => {
    expect(normaliseLabel("Résidence principale")).toBe("RÉSIDENCE PRINCIPALE");
    // Unknown characters become spaces, which then collapse.
    expect(normaliseLabel("ETF  ~~  World")).toBe("ETF WORLD");
    expect(glyphIndex("~")).toBeNull();
  });

  it("never returns a label wider than the space it was given", () => {
    for (const text of ["PEA", "ASSURANCE-VIE MULTISUPPORT", "OBLIGATIONS D'ÉTAT"])
      expect(measureLabel(truncateLabel(text, SIGN_TEXT_W))).toBeLessThanOrEqual(SIGN_TEXT_W);
  });
});

describe("sign wrapping", () => {
  it("breaks on words and keeps every line inside the board", () => {
    const lines = wrapLabel("Résidence principale", SIGN_TEXT_W, SIGN_LINES);
    expect(lines).toEqual(["RÉSIDENCE", "PRINCIPALE"]);
    for (const line of lines) expect(measureLabel(line)).toBeLessThanOrEqual(SIGN_TEXT_W);
  });

  it("fits the ordinary French labels whole, without cutting a word", () => {
    // The board is sized so these never lose a letter; a narrower one turned
    // "PRINCIPALE" into "PRINCIP.".
    for (const label of [
      "Résidence principale",
      "Compte courant",
      "Assurance vie",
      "Obligations",
      "Livret A",
    ]) {
      const lines = wrapLabel(label, SIGN_TEXT_W, SIGN_LINES);
      expect(lines.join(" "), label).toBe(normaliseLabel(label));
    }
  });

  it("never produces more lines than the board has", () => {
    const lines = wrapLabel(
      "Assurance vie multisupport en unités de compte",
      SIGN_TEXT_W,
      SIGN_LINES,
    );
    expect(lines.length).toBeLessThanOrEqual(SIGN_LINES);
    for (const line of lines) expect(measureLabel(line)).toBeLessThanOrEqual(SIGN_TEXT_W);
  });

  it("cuts a single word too wide to fit rather than dropping it", () => {
    const lines = wrapLabel("Contrepartieinterbancaire", SIGN_TEXT_W, SIGN_LINES);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]!.length).toBeGreaterThan(3);
    for (const line of lines) expect(measureLabel(line)).toBeLessThanOrEqual(SIGN_TEXT_W);
  });

  it("returns nothing for a label the atlas cannot draw at all", () => {
    expect(wrapLabel("   ", SIGN_TEXT_W, SIGN_LINES)).toEqual([]);
    expect(wrapLabel("日本語", SIGN_TEXT_W, SIGN_LINES)).toEqual([]);
  });
});
