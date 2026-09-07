import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/auth-forms";
import { getServerEnv } from "@/config/env";
import { t } from "@/lib/i18n";
import { Notice } from "@/components/ui/states";

export const metadata: Metadata = { title: `${t("auth.loginTitle")} — ${t("app.name")}` };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const notice = params.reset === "1" ? t("auth.resetDone") : undefined;
  const local = getServerEnv().AUTH_PROVIDER === "local";
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold">{t("auth.loginTitle")}</h1>
      {local ? <Notice tone="info">{t("auth.localModeNotice")}</Notice> : null}
      <LoginForm next={next} notice={notice} />
    </div>
  );
}
