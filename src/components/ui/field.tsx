import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string | string[];
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

/** Label + control + hint + textual error, wired with aria-describedby. */
export function Field({ id, label, hint, error, optional, children, className }: FieldProps) {
  const errors = Array.isArray(error) ? error : error ? [error] : [];
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-fg text-sm font-medium">
        {label}
        {optional ? <span className="text-fg-muted ml-1 font-normal">(facultatif)</span> : null}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-fg-muted text-xs">
          {hint}
        </p>
      ) : null}
      {errors.length > 0 ? (
        <p id={`${id}-error`} role="alert" className="text-negative text-xs font-medium">
          {errors.join(" ")}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, hasHint: boolean, hasError: boolean): string | undefined {
  const ids = [hasHint ? `${id}-hint` : null, hasError ? `${id}-error` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}
