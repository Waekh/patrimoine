import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/states";
import { AssetList } from "@/features/assets/asset-list";
import { requireUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { getWealthOverview } from "@/services/finance/wealth-overview";

export const metadata: Metadata = { title: `${t("assets.title")} — ${t("app.name")}` };

export default async function AssetsPage({ searchParams }: PageProps<"/assets">) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const { assets, summary } = await getWealthOverview(user.id);
  const notice = params.created
    ? t("assets.created")
    : params.updated
      ? t("assets.updated")
      : params.deleted
        ? t("assets.deleted")
        : null;
  return (
    <PageContainer>
      <PageHeader
        title={t("assets.title")}
        actions={
          <Link href="/assets/new">
            <Button>{t("assets.add")}</Button>
          </Link>
        }
      />
      {notice ? (
        <Notice tone="success" className="mb-4">
          {notice}
        </Notice>
      ) : null}
      <AssetList assets={assets} values={summary.assetValues} />
    </PageContainer>
  );
}
