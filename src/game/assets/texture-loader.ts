import { Assets, TextureSource, type Texture } from "pixi.js";

export interface ManifestSprite {
  id: string;
  file: string;
  width: number;
  height: number;
  anchor: { x: number; y: number };
  footprint?: { w: number; h: number };
  placeholder: boolean;
}

export interface ClientAssetManifest {
  basePath: string;
  tile: { width: number; height: number };
  assets: ManifestSprite[];
}

/** Sprite id -> texture + metadata. The renderer never sees file names. */
export class TextureRegistry {
  private readonly textures = new Map<string, Texture>();
  private readonly meta = new Map<string, ManifestSprite>();

  constructor(readonly manifest: ClientAssetManifest) {
    for (const entry of manifest.assets) this.meta.set(entry.id, entry);
  }

  async load(ids?: readonly string[]): Promise<void> {
    // Pixel art: no interpolation anywhere.
    TextureSource.defaultOptions.scaleMode = "nearest";
    const wanted = ids
      ? ids.filter((id) => this.meta.has(id) && !this.textures.has(id))
      : this.manifest.assets.map((a) => a.id);
    if (wanted.length === 0) return;
    const bundle = Object.fromEntries(
      wanted.map((id) => [id, `${this.manifest.basePath}${this.meta.get(id)!.file}`]),
    );
    const loaded = await Assets.load<Texture>(Object.values(bundle));
    for (const id of wanted) {
      const texture = loaded[bundle[id]!];
      if (texture) {
        texture.source.scaleMode = "nearest";
        this.textures.set(id, texture);
      }
    }
  }

  get(id: string): { texture: Texture; meta: ManifestSprite } | null {
    const texture = this.textures.get(id);
    const meta = this.meta.get(id);
    return texture && meta ? { texture, meta } : null;
  }

  has(id: string): boolean {
    return this.textures.has(id);
  }
}
