import manifestJson from "../../../public/assets/asset-manifest.json";
import { z } from "zod";

const assetEntrySchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "terrain",
    "road",
    "building",
    "nature",
    "character",
    "effect",
    "decoration",
    "ui",
  ]),
  category: z.string().optional(),
  level: z.number().int().min(1).max(5).optional(),
  file: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  anchor: z.object({ x: z.number(), y: z.number() }),
  footprint: z
    .object({ w: z.number().int().positive(), h: z.number().int().positive() })
    .optional(),
  placeholder: z.boolean().default(false),
});

const manifestSchema = z.object({
  version: z.number().int(),
  basePath: z.string(),
  tile: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }),
  assets: z.array(assetEntrySchema),
});

export type AssetManifestEntry = z.infer<typeof assetEntrySchema>;
export type AssetManifest = z.infer<typeof manifestSchema> & {
  byId: Map<string, AssetManifestEntry>;
  usesPlaceholders: boolean;
};

let cached: AssetManifest | null = null;

/**
 * The manifest is the only link between sprite ids and files. It is bundled
 * (imported) so the server can reason about it without a network round-trip.
 */
export function loadAssetManifest(): AssetManifest {
  if (cached) return cached;
  const parsed = manifestSchema.parse(manifestJson);
  const byId = new Map(parsed.assets.map((a) => [a.id, a]));
  cached = { ...parsed, byId, usesPlaceholders: parsed.assets.some((a) => a.placeholder) };
  return cached;
}
