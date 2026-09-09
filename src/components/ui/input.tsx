import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Controls read as recessed: a 2 px outline in the sprite ink plus an inset
 * hard shadow. Raised surfaces (buttons, cards) use `.hard-shadow` instead, so
 * the two are never confused.
 */
const base =
  "sunken h-10 w-full rounded-md border-2 border-ink bg-surface px-3 text-sm text-fg placeholder:text-fg-muted focus:border-focus disabled:opacity-60 aria-[invalid=true]:border-negative";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(base, "pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "h-24 py-2", className)} {...rest} />;
}
