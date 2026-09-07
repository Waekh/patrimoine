import Link from "next/link";
import { t } from "@/lib/i18n";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">{t("errors.notFound")}</h1>
      <p className="text-fg-muted text-sm">{t("errors.notFoundText")}</p>
      <Link href="/" className="text-sm font-medium underline underline-offset-2">
        {t("errors.backHome")}
      </Link>
    </div>
  );
}
