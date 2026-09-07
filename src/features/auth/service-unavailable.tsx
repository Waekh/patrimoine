import Link from "next/link";
import { Notice } from "@/components/ui/states";
import { t } from "@/lib/i18n";

/**
 * Shown on the authentication pages when the deployment has no configuration:
 * a clear message instead of a server error, with no secret and no stack trace.
 */
export function ServiceUnavailable() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("errors.serviceUnavailableTitle")}</h1>
      <Notice tone="warning">{t("errors.serviceUnavailable")}</Notice>
      <p className="text-fg-muted text-xs">{t("errors.serviceUnavailableHint")}</p>
      <Link href="/demo" className="text-sm underline-offset-2 hover:underline">
        {t("home.demo")}
      </Link>
    </div>
  );
}
