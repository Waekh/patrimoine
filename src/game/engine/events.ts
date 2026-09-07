/** Minimal typed event emitter for the React <-> PixiJS boundary. */
export interface WorldEvents {
  ready: void;
  error: { message: string };
  select: { buildingId: string | null };
  hover: { buildingId: string | null };
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
