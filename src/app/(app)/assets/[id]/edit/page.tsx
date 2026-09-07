import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { AssetForm } from "@/features/assets/asset-form";
import { requireUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { uuidSchema } from "@/lib/validation/common";
import { getAsset } from "@/services/finance/asset-service";

export const metadata: Metadata = { title: `${t("assets.edit")} — ${t("app.name")}` };

export default async function EditAssetPage({ params }: PageProps<"/assets/[id]/edit">) {
  const [user, { id }] = await Promise.all([requireUser(), params]);
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) notFound();
  const asset = await getAsset(user.id, parsedId.data);
  if (!asset) notFound();
  return (
    <PageContainer>
      <PageHeader title={t("assets.edit")} description={asset.name} />
      <AssetForm asset={asset} />
    </PageContainer>
  );
}
