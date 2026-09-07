import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth/auth-forms";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: `${t("auth.resetTitle")} — ${t("app.name")}` };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : undefined;
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold">{t("auth.resetTitle")}</h1>
      <ResetPasswordForm token={token} />
    </div>
  );
}
