/** Minimal typed event emitter for the React <-> PixiJS boundary. */
export interface WorldEvents {
  ready: void;
  error: { message: string };
  select: { buildingId: string | null };
  /**
   * Mouse only, and carries the pointer position in canvas pixels: the view
   * anchors its tooltip there rather than to the building, which would need
   * re-projecting on every camera move.
   */
  hover: { buildingId: string | null; position: { x: number; y: number } | null };
  camera: { zoom: number };
}

type Handler<T> = (payload: T) => void;

export class WorldEventBus {
  private readonly handlers = new Map<keyof WorldEvents, Set<Handler<never>>>();

  on<K extends keyof WorldEvents>(event: K, handler: Handler<WorldEvents[K]>): () => void {
    const set = this.handlers.get(event) ?? new Set<Handler<never>>();
    set.add(handler as Handler<never>);
    this.handlers.set(event, set);
    return () => set.delete(handler as Handler<never>);
  }

  emit<K extends keyof WorldEvents>(event: K, payload: WorldEvents[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) (handler as Handler<WorldEvents[K]>)(payload);
  }

  clear(): void {
    this.handlers.clear();
  }
}
