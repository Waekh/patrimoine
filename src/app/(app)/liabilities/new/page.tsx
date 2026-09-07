import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { LiabilityForm } from "@/features/liabilities/liability-form";
import { withUserDb } from "@/db/user-db";
import { listAssets } from "@/db/queries/assets";
import { requireUser } from "@/lib/auth";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: `${t("liabilities.add")} — ${t("app.name")}` };

export default async function NewLiabilityPage({ searchParams }: PageProps<"/liabilities/new">) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const assets = await withUserDb(user.id, (tx) => listAssets(tx, user.id));
  const linked = typeof params.asset === "string" ? params.asset : undefined;
  return (
    <PageContainer>
      <PageHeader title={t("liabilities.add")} />
      <LiabilityForm
        assetOptions={assets.map((a) => ({ id: a.id, name: a.name }))}
        defaultLinkedAssetId={linked}
      />
    </PageContainer>
  );
}
