import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/auth-forms";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: `${t("auth.forgotTitle")} — ${t("app.name")}` };

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold">{t("auth.forgotTitle")}</h1>
      <ForgotPasswordForm />
    </div>
  );
}
