import type { Metadata } from "next";
import { withUserDb } from "@/db/user-db";
import { listSnapshots } from "@/db/queries/snapshots";
import { getClientManifest } from "@/features/world/client-manifest";
import { WorldView } from "@/features/world/world-view";
import { requireUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { getWealthOverview } from "@/services/finance/wealth-overview";
import { netWorthDeltaBps } from "@/services/finance/snapshot-delta";

export const metadata: Metadata = { title: `${t("world.title")} — ${t("app.name")}` };

export default async function WorldPage({ searchParams }: PageProps<"/world">) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const [overview, snapshots] = await Promise.all([
    getWealthOverview(user.id),
    withUserDb(user.id, (tx) => listSnapshots(tx, user.id, 2)),
  ]);
  return (
    <WorldView
      world={overview.world}
      manifest={getClientManifest()}
      assets={overview.assets}
      liabilities={overview.liabilities}
      deltaBps={netWorthDeltaBps(snapshots)}
      animateOnMount={params.welcome === "1"}
    />
  );
}
