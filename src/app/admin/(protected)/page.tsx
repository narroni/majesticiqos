import { ArrowDown, ArrowUp, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { AdminOrderList } from "@/components/admin/orders/admin-order-list";
import { OrdersByCountryChart } from "@/components/admin/overview/orders-by-country-chart";
import { RevenueChart } from "@/components/admin/overview/revenue-chart";
import { getAdminOrders } from "@/lib/data/admin-orders";
import {
  getIncompleteTranslationProductIds,
} from "@/lib/data/admin-products";
import {
  getLowStockProducts,
  getOrderCountChange,
  getOrdersByCountry,
  getOutOfStockCount,
  getPendingOrderCount,
  getRevenueByDay,
  getRevenueSummary,
  getTopProducts,
} from "@/lib/data/admin-analytics";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/utils";

const REVENUE_CHART_DAYS = 30;
const TOP_PRODUCTS_LIMIT = 5;
const RECENT_ORDERS_LIMIT = 5;

export default async function AdminOverviewPage() {
  const [
    pendingCount,
    revenue,
    orderChange,
    lowStockProducts,
    outOfStockCount,
    incompleteTranslationIds,
    revenueByDay,
    topProducts,
    ordersByCountry,
    recentOrders,
  ] = await Promise.all([
    getPendingOrderCount(),
    getRevenueSummary(),
    getOrderCountChange(),
    getLowStockProducts(),
    getOutOfStockCount(),
    getIncompleteTranslationProductIds(),
    getRevenueByDay(REVENUE_CHART_DAYS),
    getTopProducts(REVENUE_CHART_DAYS, TOP_PRODUCTS_LIMIT),
    getOrdersByCountry(REVENUE_CHART_DAYS),
    getAdminOrders({ perPage: RECENT_ORDERS_LIMIT }),
  ]);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-fg-primary font-display text-lg">Overview</h1>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        {/* Pending orders — the seller's actual daily job, so it stays the
            most prominent card, just no longer a full-width hero block. */}
        <Link
          href="/admin/orders"
          className="border-accent bg-accent/10 hover:bg-accent/15 flex flex-col justify-center gap-0.5 rounded-md border p-3 transition-colors"
        >
          <span className="text-fg-muted font-mono text-[10px] tracking-[0.15em] uppercase">
            Pending orders
          </span>
          <span className="text-accent font-display text-2xl">{pendingCount}</span>
        </Link>
        <StatCard label="Revenue today" value={formatPrice(revenue.todayCents, "en")} />
        <StatCard label="Revenue this week" value={formatPrice(revenue.weekCents, "en")} />
        <StatCard label="Revenue this month" value={formatPrice(revenue.monthCents, "en")} />
        <StatCard
          label="Orders (30d)"
          value={String(orderChange.currentCount)}
          trend={orderChange.percentChange}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin/products?stock=low_stock"
          className="border-border bg-bg-elevated hover:border-warning/50 flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors"
        >
          <span className="text-fg-muted font-mono text-[10px] tracking-[0.1em] uppercase">
            Low stock
          </span>
          <span className="text-warning font-mono text-xs">{lowStockProducts.length}</span>
        </Link>
        <Link
          href="/admin/products?stock=out_of_stock"
          className="border-border bg-bg-elevated hover:border-danger/50 flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors"
        >
          <span className="text-fg-muted font-mono text-[10px] tracking-[0.1em] uppercase">
            Out of stock
          </span>
          <span className="text-danger font-mono text-xs">{outOfStockCount}</span>
        </Link>
        <Link
          href="/admin/products?translation=incomplete"
          className="border-border bg-bg-elevated hover:border-warning/50 flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors"
        >
          <span className="text-fg-muted font-mono text-[10px] tracking-[0.1em] uppercase">
            Missing translations
          </span>
          <span className="text-warning font-mono text-xs">{incompleteTranslationIds.length}</span>
        </Link>
        <span className="text-fg-muted font-body text-[11px]">
          Revenue counts <strong>completed</strong> orders only.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="border-border bg-bg-elevated flex flex-col gap-2 rounded-md border p-3">
            <h2 className="text-fg-primary font-display text-sm">Revenue, last 30 days</h2>
            <RevenueChart data={revenueByDay} />
          </div>

          <div className="border-border bg-bg-elevated flex flex-col gap-2 rounded-md border p-3">
            <h2 className="text-fg-primary font-display text-sm">Orders by country</h2>
            <OrdersByCountryChart data={ordersByCountry} />
          </div>

          {lowStockProducts.length > 0 ? (
            <div className="border-border bg-bg-elevated flex flex-col gap-2 rounded-md border p-3">
              <h2 className="text-fg-primary flex items-center gap-1.5 font-display text-sm">
                <TriangleAlert className="text-warning size-3.5" />
                Low stock alerts
              </h2>
              <ul className="flex max-h-24 flex-col gap-1 overflow-y-auto">
                {lowStockProducts.map((product) => (
                  <li key={product.id} className="flex items-center justify-between gap-3">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="text-fg-secondary hover:text-fg-primary font-body text-xs"
                    >
                      {product.nameSq}
                    </Link>
                    <span className="text-warning font-mono text-[11px] whitespace-nowrap">
                      {product.stockQuantity} left (min {product.lowStockThreshold})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <div className="border-border bg-bg-elevated flex max-h-40 flex-col gap-2 rounded-md border p-3">
            <h2 className="text-fg-primary font-display text-sm">Top products, last 30 days</h2>
            {topProducts.length === 0 ? (
              <p className="text-fg-muted font-body text-xs">No completed orders yet.</p>
            ) : (
              <ol className="flex flex-col gap-1 overflow-y-auto">
                {topProducts.map((product, index) => (
                  <li key={product.productId} className="flex items-center justify-between gap-3">
                    <span className="text-fg-secondary font-body text-xs">
                      <span className="text-fg-muted font-mono text-[10px]">
                        {String(index + 1).padStart(2, "0")}
                      </span>{" "}
                      <Link href={`/admin/products/${product.productId}/edit`} className="hover:text-fg-primary">
                        {product.nameEn}
                      </Link>
                    </span>
                    <span className="text-fg-primary font-mono text-xs whitespace-nowrap">
                      {product.unitsSold} sold
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="border-border bg-bg-elevated flex max-h-64 flex-col gap-2 overflow-hidden rounded-md border p-3">
            <h2 className="text-fg-primary font-display text-sm">Recent orders</h2>
            <div className="overflow-y-auto">
              <AdminOrderList orders={recentOrders.items} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: number | null;
}) {
  return (
    <div className="border-border bg-bg-elevated flex flex-col justify-center gap-0.5 rounded-md border p-3">
      <span className="text-fg-muted font-mono text-[10px] tracking-[0.15em] uppercase">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-fg-primary font-display text-lg">{value}</span>
        {trend != null ? (
          <span
            className={cn(
              "flex items-center gap-0.5 font-mono text-[10px]",
              trend >= 0 ? "text-success" : "text-danger",
            )}
          >
            {trend >= 0 ? <ArrowUp className="size-2.5" /> : <ArrowDown className="size-2.5" />}
            {Math.abs(trend)}%
          </span>
        ) : null}
      </div>
    </div>
  );
}
