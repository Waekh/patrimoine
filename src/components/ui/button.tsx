import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

/**
 * Solid variants sit on a hard offset shadow and move onto it when pressed,
 * the same way a sprite sits on its ground shadow. `ghost` stays flat: it is
 * used inline, where a raised block would be noise.
 */
const variantClasses: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover border-ink hard-shadow pressable",
  secondary: "bg-surface text-fg border-ink hover:bg-surface-2 hard-shadow pressable",
  ghost: "bg-transparent text-fg border-transparent hover:bg-surface-2",
  danger: "bg-surface text-negative border-ink hover:bg-surface-2 hard-shadow pressable",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  disabled,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border-2 font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}
