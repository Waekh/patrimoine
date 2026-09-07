import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { LiabilityForm } from "@/features/liabilities/liability-form";
import { withUserDb } from "@/db/user-db";
import { listAssets } from "@/db/queries/assets";
import { requireUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { uuidSchema } from "@/lib/validation/common";
import { getLiability } from "@/services/finance/liability-service";

export const metadata: Metadata = { title: `${t("liabilities.edit")} — ${t("app.name")}` };

export default async function EditLiabilityPage({ params }: PageProps<"/liabilities/[id]/edit">) {
  const [user, { id }] = await Promise.all([requireUser(), params]);
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) notFound();
  const [liability, assets] = await Promise.all([
    getLiability(user.id, parsedId.data),
    withUserDb(user.id, (tx) => listAssets(tx, user.id)),
  ]);
  if (!liability) notFound();
  return (
    <PageContainer>
      <PageHeader title={t("liabilities.edit")} description={liability.name} />
      <LiabilityForm
        liability={liability}
        assetOptions={assets.map((a) => ({ id: a.id, name: a.name }))}
      />
    </PageContainer>
  );
}
