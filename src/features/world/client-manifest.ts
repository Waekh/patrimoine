import type { ClientAssetManifest } from "@/game/assets/texture-loader";
import { loadAssetManifest } from "@/services/world/asset-manifest";

/** Serialisable subset of the manifest handed to the client renderer. */
export function getClientManifest(): ClientAssetManifest {
  const manifest = loadAssetManifest();
  return {
    basePath: manifest.basePath,
    tile: manifest.tile,
    assets: manifest.assets.map((a) => ({
      id: a.id,
      file: a.file,
      width: a.width,
      height: a.height,
      anchor: a.anchor,
      footprint: a.footprint,
      placeholder: a.placeholder,
    })),
  };
}
