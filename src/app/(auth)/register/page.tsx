import type { Metadata } from "next";
import { isAppConfigured } from "@/config/env";
import { RegisterForm } from "@/features/auth/auth-forms";
import { ServiceUnavailable } from "@/features/auth/service-unavailable";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: `${t("auth.registerTitle")} — ${t("app.name")}` };

export default function RegisterPage() {
  if (!isAppConfigured()) return <ServiceUnavailable />;
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold">{t("auth.registerTitle")}</h1>
      <RegisterForm />
    </div>
  );
}
