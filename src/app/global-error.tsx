"use client";

import { t } from "@/lib/i18n";

/**
 * Replaces the root layout when it fails, so it carries no global stylesheet
 * and uses inline styles only.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          padding: "24px",
          textAlign: "center",
          background: "#f6f5f2",
          color: "#17181a",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <title>{t("errors.title")}</title>
        <h1 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>{t("errors.title")}</h1>
        <p style={{ fontSize: "14px", color: "#6b6e75", margin: 0 }}>{t("errors.description")}</p>
        {error.digest ? (
          <p
            style={{
              fontSize: "12px",
              color: "#6b6e75",
              fontFamily: "ui-monospace, monospace",
              margin: 0,
            }}
          >
            {t("errors.reference")} {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => retry()}
          style={{
            height: "40px",
            padding: "0 16px",
            borderRadius: "8px",
            border: "1px solid transparent",
            background: "#1f6f5b",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {t("common.retry")}
        </button>
      </body>
    </html>
  );
}
