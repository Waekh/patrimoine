import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { AssetForm } from "@/features/assets/asset-form";
import { isAssetCategory } from "@/config/categories";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: `${t("assets.add")} — ${t("app.name")}` };

export default async function NewAssetPage({ searchParams }: PageProps<"/assets/new">) {
  const params = await searchParams;
  const category = isAssetCategory(params.category) ? params.category : undefined;
  return (
    <PageContainer>
      <PageHeader title={t("assets.add")} />
      <AssetForm defaultCategory={category} />
    </PageContainer>
  );
}
