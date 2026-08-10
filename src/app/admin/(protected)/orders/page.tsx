import { cookies } from "next/headers";
import Link from "next/link";

import {
  AdminPagination,
  DEFAULT_ADMIN_PAGE_SIZE,
  parseAdminPaginationParams,
} from "@/components/admin/admin-pagination";
import { AdminOrderTable } from "@/components/admin/orders/admin-order-table";
import { KanbanBoard } from "@/components/admin/orders/kanban-board";
import { ORDERS_VIEW_COOKIE, OrdersViewToggle, type OrdersView } from "@/components/admin/orders/orders-view-toggle";
import {
  getAdminOrdersDetailed,
  getAdminOrdersForKanban,
  getOrderStatusCounts,
} from "@/lib/data/admin-orders";
import { cn } from "@/lib/cn";
import type { OrderStatus } from "@/types";

const TABS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "shipped", label: "Shipped" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function isOrdersView(value: string | undefined): value is OrdersView {
  return value === "list" || value === "kanban";
}

interface AdminOrdersPageProps {
  searchParams: Promise<{ status?: string; page?: string; perPage?: string; view?: string }>;
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const [params, cookieStore] = await Promise.all([searchParams, cookies()]);
  const activeTab = (params.status as OrderStatus | "all" | undefined) ?? "pending";
  const { page, perPage } = parseAdminPaginationParams(params);

  // URL wins when present (survives a refresh and a back-press); otherwise
  // fall back to the remembered cookie, then to list.
  const cookieView = cookieStore.get(ORDERS_VIEW_COOKIE)?.value;
  const view: OrdersView = isOrdersView(params.view)
    ? params.view
    : isOrdersView(cookieView)
      ? cookieView
      : "list";

  const [counts, result, kanbanColumns] = await Promise.all([
    getOrderStatusCounts(),
    getAdminOrdersDetailed({ status: activeTab === "all" ? undefined : activeTab, page, perPage }),
    view === "kanban" ? getAdminOrdersForKanban() : Promise.resolve(null),
  ]);

  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const queryWithoutPagination = new URLSearchParams();
  if (activeTab !== "pending") queryWithoutPagination.set("status", activeTab);

  // Page SIZE is a display preference that survives a tab switch; the page
  // NUMBER resets to 1 — each status tab paginates independently, so
  // carrying page 3 from "Pending" into "Completed" would just strand you
  // past the end of a shorter list.
  function tabHref(status: OrderStatus | "all"): string {
    const tabParams = new URLSearchParams();
    if (status !== "pending") tabParams.set("status", status);
    if (perPage !== DEFAULT_ADMIN_PAGE_SIZE) tabParams.set("perPage", String(perPage));
    const query = tabParams.toString();
    return query ? `/admin/orders?${query}` : "/admin/orders";
  }

  const tabs = (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {TABS.map((tab) => (
        <Link
          key={tab.value}
          href={tabHref(tab.value)}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 font-mono text-xs whitespace-nowrap transition-colors",
            activeTab === tab.value
              ? "border-accent bg-accent text-bg-base"
              : "border-border-strong text-fg-secondary hover:text-fg-primary",
          )}
        >
          {tab.label} ({tab.value === "all" ? totalCount : counts[tab.value]})
        </Link>
      ))}
    </div>
  );

  const list = (
    <>
      <AdminOrderTable orders={result.items} />
      <AdminPagination
        page={result.page}
        perPage={result.perPage}
        total={result.total}
        basePath="/admin/orders"
        queryWithoutPagination={queryWithoutPagination.toString()}
      />
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-h2 font-display text-fg-primary">Orders</h1>
        <OrdersViewToggle currentView={view} />
      </div>

      {view === "kanban" && kanbanColumns ? (
        <KanbanBoard columns={kanbanColumns} />
      ) : (
        <>
          {tabs}
          {list}
        </>
      )}
    </div>
  );
}
