import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { REFERENCE_CURRENCY } from "@/config/currencies";
import { LogoutButton } from "@/features/auth/logout-button";
import { restartOnboardingAction } from "@/features/settings/actions";
import { ThemeToggle } from "@/features/settings/theme-toggle";
import { requireUser } from "@/lib/auth";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: `${t("settings.title")} — ${t("app.name")}` };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <PageContainer>
      <PageHeader title={t("settings.title")} />
      <div className="flex max-w-2xl flex-col gap-4">
        <Card className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold">{t("settings.account")}</h2>
          <p className="text-fg-muted text-sm">{user.email}</p>
          <LogoutButton />
        </Card>
        <Card className="flex flex-col gap-4">
          <Field
            id="referenceCurrency"
            label={t("settings.referenceCurrency")}
            hint={t("settings.referenceCurrencyHint")}
          >
            <p id="referenceCurrency" className="tabular font-mono text-sm">
              {REFERENCE_CURRENCY}
            </p>
          </Field>
          <Field id="theme" label={t("settings.theme")}>
            <ThemeToggle id="theme" />
          </Field>
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">{t("onboarding.title")}</h2>
          <form action={restartOnboardingAction}>
            <Button type="submit" variant="secondary">
              {t("settings.restartOnboarding")}
            </Button>
          </form>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">{t("settings.legal")}</h2>
          <p className="text-fg-muted text-sm">{t("app.disclaimer")}</p>
          <p className="text-fg-muted text-sm">{t("settings.dataPrivacy")}</p>
        </Card>
      </div>
    </PageContainer>
  );
}
