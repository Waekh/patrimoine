import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The design system mandates WCAG AA (4.5:1) for text. The palette is tuned by
 * hand against the world's colours, so these ratios are checked rather than
 * assumed: a token nudged for looks must not quietly break readability.
 */
const css = readFileSync(path.join(process.cwd(), "src", "app", "globals.css"), "utf8");

function tokens(selector: string): Record<string, string> {
  const block = css.slice(css.indexOf(`${selector} {`));
  const body = block.slice(0, block.indexOf("}"));
  const out: Record<string, string> = {};
  for (const [, name, value] of body.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-f]{6})/gi))
    out[name!] = value!;
  return out;
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const THEMES = [
  { name: "clair", palette: tokens(":root") },
  { name: "sombre", palette: tokens(".dark") },
];

/** Text colours that must stay readable on both page and card surfaces. */
const TEXT_ON_SURFACE = ["--fg", "--fg-muted", "--positive", "--negative", "--warning"];

describe.each(THEMES)("palette $name", ({ palette }) => {
  it("defines every token the interface reads", () => {
    for (const token of [
      "--bg",
      "--surface",
      "--surface-2",
      "--border",
      "--ink",
      "--fg",
      "--fg-muted",
      "--accent",
      "--accent-hover",
      "--accent-fg",
      "--positive",
      "--negative",
      "--warning",
      "--focus",
      "--world-bg",
    ])
      expect(palette[token], token).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it.each(TEXT_ON_SURFACE)("keeps %s readable on every surface", (token) => {
    for (const ground of ["--bg", "--surface", "--surface-2"])
      expect(
        contrast(palette[token]!, palette[ground]!),
        `${token} sur ${ground}`,
      ).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the label of a primary action readable", () => {
    expect(contrast(palette["--accent-fg"]!, palette["--accent"]!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(palette["--accent-fg"]!, palette["--accent-hover"]!)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it("keeps the focus ring and control borders visible (3:1 for non-text)", () => {
    for (const ground of ["--bg", "--surface"]) {
      expect(
        contrast(palette["--focus"]!, palette[ground]!),
        `focus sur ${ground}`,
      ).toBeGreaterThanOrEqual(3);
      expect(
        contrast(palette["--ink"]!, palette[ground]!),
        `ink sur ${ground}`,
      ).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("shape language", () => {
  it("has no rounded corner on controls: the world has none either", () => {
    expect(css).toMatch(/--radius-sm:\s*0px/);
    expect(css).toMatch(/--radius-md:\s*0px/);
  });

  it("recesses inputs with an inset offset, never a blur", () => {
    const shadow = css.match(/\.sunken\s*\{[^}]*box-shadow:\s*([^;]+);/)?.[1] ?? "";
    expect(shadow).toContain("inset");
    expect(shadow).toContain("var(--ink)");
    // Third length is the blur radius: it must stay at zero.
    expect(shadow.trim()).toMatch(/^inset 2px 2px 0/);
  });

  it("blinks in whole steps rather than fading", () => {
    const blink = css.match(/\.blink\s*\{[^}]*animation:\s*([^;]+);/)?.[1] ?? "";
    expect(blink).toContain("steps(");
  });

  it("offsets shadows instead of blurring them", () => {
    const shadow = css.match(/\.hard-shadow\s*\{[^}]*box-shadow:\s*([^;]+);/)?.[1] ?? "";
    expect(shadow).toContain("var(--ink)");
    // Third length is the blur radius: it must stay at zero.
    expect(shadow.trim()).toMatch(/^2px 2px 0/);
  });
});
