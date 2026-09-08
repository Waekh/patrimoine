import "server-only";
import type { WealthSummary } from "@/services/finance/wealth-calculation";
import { buildWorld, computeSummary } from "@/services/finance/wealth-overview";
import type { WorldState } from "@/types/world";
import { SHOWCASE_ASSETS, SHOWCASE_LIABILITIES } from "./showcase-dataset";

let cached: Promise<{ summary: WealthSummary; world: WorldState }> | null = null;

/**
 * The home page landscape. Input and generation are deterministic, so it is
 * computed once per server instance instead of on every request.
 */
export function getShowcaseWorld(): Promise<{ summary: WealthSummary; world: WorldState }> {
  cached ??= (async () => {
    const summary = await computeSummary(SHOWCASE_ASSETS, SHOWCASE_LIABILITIES);
    return {
      summary,
      world: buildWorld("showcase", SHOWCASE_ASSETS, SHOWCASE_LIABILITIES, summary),
    };
  })();
  return cached;
}
