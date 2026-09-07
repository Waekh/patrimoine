"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export interface PercentageInputProps {
  id: string;
  name: string;
  /** Initial value in basis points. */
  defaultBps?: number | null;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
}

function bpsToDisplay(bps: number): string {
  return (bps / 100).toFixed(2).replace(".", ",").replace(/,?0+$/, "");
}

function displayToBps(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [intPart = "0", frac = ""] = normalized.split(".");
  return Number(intPart) * 100 + Number(frac.padEnd(2, "0"));
}

/** Percentage input ("1,25") submitted as integer basis points in a hidden field. */
export function PercentageInput({
  id,
  name,
  defaultBps,
  invalid,
  describedBy,
  className,
}: PercentageInputProps) {
  const [display, setDisplay] = useState(defaultBps == null ? "" : bpsToDisplay(defaultBps));
  const bps = display.trim() === "" ? null : displayToBps(display);
  return (
    <div className={cn("relative", className)}>
      <input
        id={id}
        name={`${name}_display`}
        inputMode="decimal"
        autoComplete="off"
        value={display}
        onChange={(e) => setDisplay(e.target.value)}
        aria-invalid={invalid || (display !== "" && bps == null) || undefined}
        aria-describedby={describedBy}
        placeholder="0,00"
        className="tabular border-border bg-surface focus:border-focus aria-[invalid=true]:border-negative h-10 w-full rounded-md border pr-8 pl-3 font-mono text-sm"
      />
      <span
        aria-hidden="true"
        className="text-fg-muted pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm"
      >
        %
      </span>
      <input type="hidden" name={name} value={bps == null ? "" : String(bps)} />
    </div>
  );
}
