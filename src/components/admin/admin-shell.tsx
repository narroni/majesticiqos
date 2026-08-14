"use client";

import {
  ClipboardList,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType, type ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { siteConfig } from "@/config/site";
import {
  ADMIN_SIDEBAR_COLLAPSED_COOKIE,
  ADMIN_SIDEBAR_COLLAPSED_COOKIE_MAX_AGE,
} from "@/lib/admin-sidebar-cookie";
import { signOutAdmin } from "@/lib/actions/admin-auth";
import type { AdminUser } from "@/lib/auth/get-admin-user";
import { cn } from "@/lib/cn";
import { getSiteUrl } from "@/lib/seo";
import { setCookie } from "@/lib/utils";

// Base UI's Trigger takes the target element as `render` (props merged onto
// it), not Radix's `asChild` — this project's other Base UI-backed
// primitives already follow this pattern (see DropdownMenuTrigger usages).

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

function SignOutIconButton() {
  return (
    <form action={signOutAdmin}>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="submit"
              aria-label="Sign out"
              className="text-fg-secondary hover:text-danger flex w-full items-center justify-center rounded-sm py-2 transition-colors"
            />
          }
        >
          <LogOut className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="right">Sign out</TooltipContent>
      </Tooltip>
    </form>
  );
}

interface AdminShellProps {
  admin: AdminUser;
  children: ReactNode;
  initialSidebarCollapsed?: boolean;
}

export function AdminShell({ admin, children, initialSidebarCollapsed = false }: AdminShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialSidebarCollapsed);
  const siteUrl = getSiteUrl();

  function isActive(item: NavItem) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      setCookie(
        ADMIN_SIDEBAR_COLLAPSED_COOKIE,
        next ? "1" : "0",
        ADMIN_SIDEBAR_COLLAPSED_COOKIE_MAX_AGE,
      );
      return next;
    });
  }

  function navLink(item: NavItem) {
    const linkClassName = cn(
      "flex items-center gap-3 rounded-sm px-3 py-2 font-body text-sm transition-colors",
      collapsed && "justify-center px-0",
      isActive(item)
        ? "bg-bg-subtle text-fg-primary"
        : "text-fg-secondary hover:bg-bg-subtle hover:text-fg-primary",
    );

    if (!collapsed) {
      return (
        <Link key={item.href} href={item.href} className={linkClassName}>
          <item.icon className="size-4 shrink-0" />
          {item.label}
        </Link>
      );
    }

    return (
      <Tooltip key={item.href}>
        <TooltipTrigger
          render={<Link href={item.href} aria-label={item.label} className={linkClassName} />}
        >
          <item.icon className="size-4 shrink-0" />
        </TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  const viewSiteLink = (
    <a
      href={siteUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={collapsed ? "View site" : undefined}
      className={cn(
        "text-fg-secondary hover:text-fg-primary flex items-center gap-3 rounded-sm px-3 py-2 font-body text-sm transition-colors",
        collapsed && "justify-center px-0",
      )}
    >
      <ExternalLink className="size-4 shrink-0" />
      {collapsed ? null : "View site"}
    </a>
  );

  return (
    <TooltipProvider>
      <div className="flex min-h-dvh flex-col lg:flex-row">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "border-border bg-bg-elevated hidden shrink-0 flex-col justify-between border-r transition-[width] duration-200 lg:flex",
            collapsed ? "w-16 p-3" : "w-64 p-6",
          )}
        >
          <div className="flex flex-col gap-8">
            <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
              <Image src="/logo.png" alt={siteConfig.name} width={32} height={32} className="h-8 w-8 shrink-0" />
              {collapsed ? null : (
                <span className="font-display text-fg-primary text-lg tracking-[0.1em] uppercase">
                  Admin
                </span>
              )}
            </div>

            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={toggleCollapsed}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    className={cn(
                      "text-fg-secondary hover:bg-bg-subtle hover:text-fg-primary flex items-center gap-3 rounded-sm px-3 py-2 font-body text-sm transition-colors",
                      collapsed && "justify-center px-0",
                    )}
                  />
                }
              >
                {collapsed ? (
                  <PanelLeftOpen className="size-4 shrink-0" />
                ) : (
                  <PanelLeftClose className="size-4 shrink-0" />
                )}
                {collapsed ? null : "Collapse"}
              </TooltipTrigger>
              {collapsed ? <TooltipContent side="right">Expand sidebar</TooltipContent> : null}
            </Tooltip>

            <nav className="flex flex-col gap-1">{NAV_ITEMS.map(navLink)}</nav>

            {/* Visually separated from the main nav — a link out of admin
                entirely, not another admin section. */}
            <div className="border-border flex flex-col gap-1 border-t pt-4">{viewSiteLink}</div>
          </div>

          <div className="border-border flex flex-col gap-3 border-t pt-4">
            {collapsed ? null : (
              <div className="flex flex-col">
                <span className="text-fg-primary font-body text-sm">
                  {admin.full_name ?? admin.email}
                </span>
                <span className="text-fg-muted font-mono text-xs uppercase">{admin.role}</span>
              </div>
            )}
            {collapsed ? (
              <SignOutIconButton />
            ) : (
              <SignOutButton className="text-fg-secondary hover:text-danger text-left" />
            )}
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="border-border bg-bg-elevated flex items-center justify-between border-b px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt={siteConfig.name} width={28} height={28} className="h-7 w-7" />
            <span className="font-display text-fg-primary text-base tracking-[0.1em] uppercase">
              Admin
            </span>
          </div>
          <SignOutButton className="text-fg-secondary hover:text-danger" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-24 lg:p-8 lg:pb-8">{children}</main>

        {/* Mobile bottom nav — thumb-reachable beats a hidden sheet for
            "confirming orders from bed" on a phone. Unchanged by the
            desktop sidebar's collapse behavior. */}
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
    </TooltipProvider>
  );
}
