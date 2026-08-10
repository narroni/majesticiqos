"use client";

import { ClipboardList, FolderTree, LayoutDashboard, Package, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";

import { siteConfig } from "@/config/site";
import { signOutAdmin } from "@/lib/actions/admin-auth";
import type { AdminUser } from "@/lib/auth/get-admin-user";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOutAdmin}>
      <button type="submit" className={cn("font-body text-sm", className)}>
        Sign out
      </button>
    </form>
  );
}

interface AdminShellProps {
  admin: AdminUser;
  children: ReactNode;
}

export function AdminShell({ admin, children }: AdminShellProps) {
  const pathname = usePathname();

  function isActive(item: NavItem) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="border-border bg-bg-elevated hidden w-64 shrink-0 flex-col justify-between border-r p-6 lg:flex">
        <div className="flex flex-col gap-8">
          <span className="font-display text-fg-primary text-lg tracking-[0.1em] uppercase">
            {siteConfig.name} Admin
          </span>
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-sm px-3 py-2 font-body text-sm transition-colors",
                  isActive(item)
                    ? "bg-bg-subtle text-fg-primary"
                    : "text-fg-secondary hover:bg-bg-subtle hover:text-fg-primary",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-border flex flex-col gap-3 border-t pt-4">
          <div className="flex flex-col">
            <span className="text-fg-primary font-body text-sm">
              {admin.full_name ?? admin.email}
            </span>
            <span className="text-fg-muted font-mono text-xs uppercase">{admin.role}</span>
          </div>
          <SignOutButton className="text-fg-secondary hover:text-danger text-left" />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="border-border bg-bg-elevated flex items-center justify-between border-b px-4 py-3 lg:hidden">
        <span className="font-display text-fg-primary text-base tracking-[0.1em] uppercase">
          {siteConfig.name} Admin
        </span>
        <SignOutButton className="text-fg-secondary hover:text-danger" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-24 lg:p-8 lg:pb-8">{children}</main>

      {/* Mobile bottom nav — thumb-reachable beats a hidden sheet for
          "confirming orders from bed" on a phone. */}
      <nav className="border-border bg-bg-elevated fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t py-2 lg:hidden">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1 font-mono text-[10px] tracking-wide uppercase",
              isActive(item) ? "text-accent" : "text-fg-muted",
            )}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
