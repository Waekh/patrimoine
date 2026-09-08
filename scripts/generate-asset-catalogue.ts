import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Builds an HTML sheet showing every sprite of the manifest, grouped and
 * labelled, for visual review. Sprites are enlarged with nearest-neighbour so
 * the pixels stay square, as required by PIXEL_ART_BIBLE.md.
 *
 * Usage: npm run assets:catalogue -- <fichier-de-sortie.html>
 */
interface Entry {
  id: string;
  type: string;
  level?: number;
  file: string;
  width: number;
  height: number;
  footprint?: { w: number; h: number };
  placeholder: boolean;
}

const ROOT = path.join(process.cwd(), "public", "assets");
const manifest = JSON.parse(readFileSync(path.join(ROOT, "asset-manifest.json"), "utf8")) as {
  assets: Entry[];
};

const BUILDING_LABELS: Record<string, string> = {
  house: "Maison",
  apartment: "Immeuble",
  realestate: "Immeuble de rapport",
  warehouse: "Entrepôt",
  bank: "Banque",
  vault: "Coffre",
  financial: "Bâtiment financier",
  market: "Bourse",
};

function dataUri(entry: Entry): string {
  const bytes = readFileSync(path.join(ROOT, entry.file));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

function cell(entry: Entry, scale: number): string {
  return `<figure class="sprite">
    <div class="frame"><img src="${dataUri(entry)}" width="${entry.width * scale}" height="${entry.height * scale}" alt="${entry.id}"></div>
    <figcaption><span class="id">${entry.id}</span><span class="dim">${entry.width}×${entry.height}${entry.footprint ? ` · emprise ${entry.footprint.w}×${entry.footprint.h}` : ""}</span></figcaption>
  </figure>`;
}

function section(title: string, entries: Entry[], scale: number): string {
  return `<section><h2>${title}</h2><div class="row">${entries.map((e) => cell(e, scale)).join("")}</div></section>`;
}

function buildingSection(title: string, kinds: string[], scale: number): string {
  const rows = kinds
    .map((kind) => {
      const levels = manifest.assets
        .filter((a) => a.id.startsWith(`${kind}_lv`))
        .sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
      return `<div class="kind"><h3>${BUILDING_LABELS[kind] ?? kind}</h3><div class="row baseline">${levels.map((e) => cell(e, scale)).join("")}</div></div>`;
    })
    .join("");
  return `<section><h2>${title}</h2>${rows}</section>`;
}

const byType = (type: string): Entry[] => manifest.assets.filter((a) => a.type === type);

const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Patrimoine.net — catalogue des sprites</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 28px 32px; background: #1b2a3a; color: #e8e4d8;
         font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  h1 { margin: 0 0 4px; font-size: 20px; font-weight: 600; letter-spacing: -0.01em; }
  .lede { margin: 0 0 28px; font-size: 13px; color: #9fb0c0; }
  h2 { margin: 28px 0 12px; font-size: 14px; font-weight: 600; text-transform: uppercase;
       letter-spacing: 0.06em; color: #9fb0c0; border-bottom: 1px solid #2c4055; padding-bottom: 6px; }
  h3 { margin: 16px 0 8px; font-size: 13px; font-weight: 600; color: #e8e4d8; }
  .row { display: flex; flex-wrap: wrap; gap: 20px; }
  .row.baseline { align-items: flex-end; }
  .sprite { margin: 0; display: flex; flex-direction: column; gap: 6px; align-items: center; }
  .frame { display: flex; align-items: flex-end; justify-content: center; padding: 8px 10px;
           background: #16222f; border: 1px solid #2c4055; border-radius: 6px; }
  img { image-rendering: pixelated; display: block; }
  figcaption { display: flex; flex-direction: column; align-items: center; gap: 1px; }
  .id { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; color: #e8e4d8; }
  .dim { font-size: 10px; color: #7f93a6; }
</style></head><body>
<h1>Patrimoine.net — catalogue des sprites</h1>
<p class="lede">${manifest.assets.length} sprites, tuile ${64}×${32}, projection isométrique 2:1. Agrandis au plus proche voisin. Tous sont des placeholders générés par script.</p>
${section("Terrain et routes", [...byType("terrain"), ...byType("road")], 3)}
${buildingSection("Bâtiments — résidentiel et immobilier", ["house", "apartment", "realestate", "warehouse"], 2)}
${buildingSection("Bâtiments — finance et liquidités", ["bank", "vault", "financial", "market"], 2)}
${section("Nature, décor et personnage", [...byType("nature"), ...byType("decoration"), ...byType("character")], 3)}
${section("Effets et interface", [...byType("effect"), ...byType("ui")], 2)}
</body></html>`;

const output = process.argv[2] ?? path.join(process.cwd(), "asset-catalogue.html");
writeFileSync(output, html);
console.log(`${output} généré (${manifest.assets.length} sprites).`);
