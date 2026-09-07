import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./logo";
import { BottomNav, SidebarNav } from "./app-nav";
import { LogoutButton } from "@/features/auth/logout-button";

export function AppShell({ children, email }: { children: ReactNode; email: string }) {
  return (
    <div className="flex min-h-screen">
      <aside className="border-border bg-surface sticky top-0 hidden h-screen w-[210px] shrink-0 flex-col border-r px-3 py-4 md:flex">
        <Link href="/world" className="px-3 pb-6">
          <Logo />
        </Link>
        <SidebarNav />
        <div className="text-fg-muted mt-auto flex flex-col gap-2 px-3 pt-4 text-xs">
          <span className="truncate" title={email}>
            {email}
          </span>
          <LogoutButton />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-surface flex h-12 items-center justify-between border-b px-4 md:hidden">
          <Link href="/world">
            <Logo />
          </Link>
          <Link href="/settings" className="text-fg-muted text-xs">
            {email}
          </Link>
        </header>
        <main className="relative flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
