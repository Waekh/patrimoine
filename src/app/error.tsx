"use client";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

/**
 * Route-level error boundary. Shows the generic message only: details stay in
 * the server logs and are matched through the digest reference.
 */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">{t("errors.title")}</h1>
      <p className="text-fg-muted text-sm">{t("errors.description")}</p>
      {error.digest ? (
        <p className="tabular text-fg-muted font-mono text-xs">
          {t("errors.reference")} {error.digest}
        </p>
      ) : null}
      <Button onClick={() => retry()}>{t("common.retry")}</Button>
    </div>
  );
}
