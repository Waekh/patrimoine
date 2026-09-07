import type { ReactNode } from "react";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils/cn";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center",
        className,
      )}
    >
      <p className="text-base font-medium">{title}</p>
      {description ? <p className="text-fg-muted max-w-md text-sm">{description}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "border-border bg-surface flex flex-col items-start gap-3 rounded-lg border p-4",
        className,
      )}
    >
      <p className="text-negative text-sm">{message ?? t("common.genericError")}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-medium underline underline-offset-2"
        >
          {t("common.retry")}
        </button>
      ) : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("bg-surface-2 animate-pulse rounded-md", className)} />
  );
}

export function Progress({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="text-fg-muted flex justify-between text-xs">
        <span>{label}</span>
        <span className="tabular">{pct} %</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        className="bg-surface-2 h-1.5 w-full overflow-hidden rounded-full"
      >
        <div
          className="bg-accent h-full transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function Notice({
  children,
  tone = "info",
  className,
}: {
  children: ReactNode;
  tone?: "info" | "warning" | "success" | "error";
  className?: string;
}) {
  const tones = {
    info: "border-border bg-surface-2 text-fg",
    warning: "border-warning/40 bg-surface text-warning",
    success: "border-positive/40 bg-surface text-positive",
    error: "border-negative/40 bg-surface text-negative",
  };
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-md border px-3 py-2 text-sm", tones[tone], className)}
    >
      {children}
    </div>
  );
}
