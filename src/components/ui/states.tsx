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
        "border-ink flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center",
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
        "border-ink bg-surface hard-shadow flex flex-col items-start gap-3 rounded-lg border-2 p-4",
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
  return <div aria-hidden="true" className={cn("bg-surface-2 blink rounded-md", className)} />;
}

/** Blocks in the progress bar. Twenty reads as a bar without becoming a line. */
const PROGRESS_SEGMENTS = 20;

export function Progress({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="text-fg-muted flex justify-between text-xs">
        <span>{label}</span>
        <span className="tabular">{pct} %</span>
      </div>
      {/*
        Segmented rather than a smooth fill: a continuous bar is the one shape
        in the interface a pixel world cannot draw. Each block is a whole step,
        so the bar advances in jumps like the rest of the chrome.
      */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        className="border-ink sunken flex h-4 w-full gap-0.5 border-2 p-0.5"
      >
        {Array.from({ length: PROGRESS_SEGMENTS }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={
              index < Math.round((pct / 100) * PROGRESS_SEGMENTS)
                ? "bg-accent flex-1"
                : "bg-surface-2 flex-1"
            }
          />
        ))}
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
  // Solid borders rather than a translucent tint: a faded edge is a blur by
  // another name, and the palette has no such thing.
  const tones = {
    info: "border-ink bg-surface-2 text-fg",
    warning: "border-warning bg-surface text-warning",
    success: "border-positive bg-surface text-positive",
    error: "border-negative bg-surface text-negative",
  };
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-md border-2 px-3 py-2 text-sm", tones[tone], className)}
    >
      {children}
    </div>
  );
}
