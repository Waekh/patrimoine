"use client";

import { useState, type ChangeEvent } from "react";
import { CURRENCY_MINOR_DIGITS, type CurrencyCode } from "@/config/currencies";
import { centsToMajorUnitsString, parseMajorUnitsToCents } from "@/lib/money";
import { cn } from "@/lib/utils/cn";

export interface CurrencyInputProps {
  id: string;
  name: string;
  currency: CurrencyCode;
  /** Initial value in cents. */
  defaultCents?: number | null;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
  className?: string;
  onCentsChange?: (cents: number | null) => void;
}

/**
 * Text input for money in major units ("1234,56"). Submits the integer cents
 * value through a hidden field named `name`; the visible field is `${name}_display`.
 */
export function CurrencyInput({
  id,
  name,
  currency,
  defaultCents,
  required,
  invalid,
  describedBy,
  disabled,
  className,
  onCentsChange,
}: CurrencyInputProps) {
  const [display, setDisplay] = useState(
    defaultCents == null ? "" : centsToMajorUnitsString(defaultCents, currency).replace(".", ","),
  );
  const cents = display.trim() === "" ? null : parseMajorUnitsToCents(display, currency);
  const digits = CURRENCY_MINOR_DIGITS[currency];

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setDisplay(e.target.value);
    const next =
      e.target.value.trim() === "" ? null : parseMajorUnitsToCents(e.target.value, currency);
    onCentsChange?.(next);
  }

  return (
    <div className={cn("relative", className)}>
      <input
        id={id}
        name={`${name}_display`}
        inputMode="decimal"
        autoComplete="off"
        value={display}
        onChange={handleChange}
        required={required}
        disabled={disabled}
        aria-invalid={invalid || (display !== "" && cents == null) || undefined}
        aria-describedby={describedBy}
        placeholder={digits === 0 ? "0" : "0,00"}
        className="tabular border-ink bg-surface sunken focus:border-focus aria-[invalid=true]:border-negative h-10 w-full rounded-md border-2 pr-12 pl-3 font-mono text-sm disabled:opacity-60"
      />
      <span
        aria-hidden="true"
        className="text-fg-muted pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm"
      >
        {currency}
      </span>
      <input type="hidden" name={name} value={cents == null ? "" : String(cents)} />
    </div>
  );
}
