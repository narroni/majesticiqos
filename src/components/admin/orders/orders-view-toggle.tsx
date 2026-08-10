"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/cn";
import { setCookie } from "@/lib/utils";

export const ORDERS_VIEW_COOKIE = "admin-orders-view";
const ORDERS_VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type OrdersView = "list" | "kanban";

export function OrdersViewToggle({ currentView }: { currentView: OrdersView }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setView(view: OrdersView) {
    // Cookie remembers the choice for next time; the URL param wins on this
    // visit (survives a refresh and a back-press) — same "URL first, cookie
    // as the remembered default" split as the storefront's locale switcher.
    setCookie(ORDERS_VIEW_COOKIE, view, ORDERS_VIEW_COOKIE_MAX_AGE);

    const params = new URLSearchParams(searchParams);
    if (view === "list") {
      params.delete("view");
    } else {
      params.set("view", view);
    }
    // Pagination is a list-only concept — dropping it here avoids landing on
    // a stranded page number if the user flips back to list later.
    params.delete("page");

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="border-border-strong inline-flex shrink-0 rounded-full border p-0.5">
      <button
        type="button"
        onClick={() => setView("list")}
        className={cn(
          "rounded-full px-3 py-1 font-mono text-xs transition-colors",
          currentView === "list"
            ? "bg-accent text-bg-base"
            : "text-fg-secondary hover:text-fg-primary",
        )}
      >
        List
      </button>
      <button
        type="button"
        onClick={() => setView("kanban")}
        className={cn(
          "rounded-full px-3 py-1 font-mono text-xs transition-colors",
          currentView === "kanban"
            ? "bg-accent text-bg-base"
            : "text-fg-secondary hover:text-fg-primary",
        )}
      >
        Kanban
      </button>
    </div>
  );
}
