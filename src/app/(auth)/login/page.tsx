import type { Metadata } from "next";
import { getConfigurationStatus } from "@/config/env";
import { Notice } from "@/components/ui/states";
import { LoginForm } from "@/features/auth/auth-forms";
import { ServiceUnavailable } from "@/features/auth/service-unavailable";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: `${t("auth.loginTitle")} — ${t("app.name")}` };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const status = getConfigurationStatus();
  if (!status.ok) return <ServiceUnavailable />;

  const next = typeof params.next === "string" ? params.next : undefined;
  const notice = params.reset === "1" ? t("auth.resetDone") : undefined;
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold">{t("auth.loginTitle")}</h1>
      {status.env.AUTH_PROVIDER === "local" ? (
        <Notice tone="info">{t("auth.localModeNotice")}</Notice>
      ) : null}
      <LoginForm next={next} notice={notice} />
    </div>
  );
}
