import { formatPercentage } from "@/lib/formatting";
import { cn } from "@/lib/utils/cn";

export interface MetricProps {
  label: string;
  value: string;
  /** Variation in basis points; rendered with sign and colour. */
  deltaBps?: number | null;
  deltaLabel?: string;
  size?: "md" | "lg";
  className?: string;
}

export function Metric({
  label,
  value,
  deltaBps,
  deltaLabel,
  size = "md",
  className,
}: MetricProps) {
  const tone =
    deltaBps == null
      ? ""
      : deltaBps > 0
        ? "text-positive"
        : deltaBps < 0
          ? "text-negative"
          : "text-fg-muted";
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-fg-muted text-xs font-medium tracking-wide uppercase">{label}</span>
      <span
        className={cn("tabular font-mono font-semibold", size === "lg" ? "text-3xl" : "text-xl")}
      >
        {value}
      </span>
      {deltaBps != null ? (
        <span className={cn("tabular text-xs font-medium", tone)}>
          {formatPercentage(deltaBps)}
          {deltaLabel ? <span className="text-fg-muted ml-1 font-normal">{deltaLabel}</span> : null}
        </span>
      ) : null}
    </div>
  );
}
