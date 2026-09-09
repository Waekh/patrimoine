"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { Icons } from "@/components/ui/icons";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils/cn";

const items: Array<{ href: Route; label: string; icon: keyof typeof Icons }> = [
  { href: "/world", label: t("nav.world"), icon: "world" },
  { href: "/patrimoine", label: t("nav.wealth"), icon: "wealth" },
  { href: "/assets", label: t("nav.assets"), icon: "assets" },
  { href: "/liabilities", label: t("nav.liabilities"), icon: "liabilities" },
  { href: "/history", label: t("nav.history"), icon: "history" },
  { href: "/settings", label: t("nav.settings"), icon: "settings" },
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation principale" className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = Icons[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-surface-2 text-fg font-medium"
                : "text-fg-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation principale"
      className="border-ink bg-surface fixed inset-x-0 bottom-0 z-30 flex border-t-2 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {items.slice(0, 5).map((item) => {
        const Icon = Icons[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]",
              active ? "text-fg" : "text-fg-muted",
            )}
          >
            <Icon size={20} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
