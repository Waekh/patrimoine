import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border-ink bg-surface hard-shadow rounded-lg border-2 p-5", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface PanelProps {
  title: string;
  onClose?: () => void;
  closeLabel?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function Panel({
  title,
  onClose,
  closeLabel = "Fermer",
  children,
  className,
  actions,
}: PanelProps) {
  return (
    <section
      className={cn(
        "border-ink bg-surface hard-shadow flex flex-col rounded-lg border-2",
        className,
      )}
      aria-label={title}
    >
      <header className="border-border flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          {actions}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="text-fg-muted hover:bg-surface-2 hover:text-fg rounded-md p-1"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="pixel-edges"
              >
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          ) : null}
        </div>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
