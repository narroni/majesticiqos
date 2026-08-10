import type { AdminOrderDetail } from "@/lib/data/admin-orders";
import { STATUS_LABEL } from "@/lib/order-status";
import { cn } from "@/lib/cn";
import type { OrderStatus } from "@/types";

const STEP_ORDER: OrderStatus[] = ["pending", "confirmed", "preparing", "shipped", "completed"];

function formatTimestamp(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
}

export function OrderStatusStepper({ order }: { order: AdminOrderDetail }) {
  if (order.status === "cancelled") {
    return (
      <div className="border-danger/40 bg-danger/10 flex items-center gap-2 rounded-md border px-4 py-3">
        <span className="bg-danger size-2.5 shrink-0 rounded-full" />
        <span className="text-danger font-mono text-sm">
          Cancelled — {formatTimestamp(order.cancelledAt)}
        </span>
      </div>
    );
  }

  const currentIndex = STEP_ORDER.indexOf(order.status);
  // There is no preparing_at column (BLUEPRINT §2.3 tracks only
  // confirmed/shipped/completed/cancelled timestamps) — shown as "—"
  // rather than guessing one.
  const timestamps: Record<OrderStatus, string | null> = {
    pending: order.createdAt,
    confirmed: order.confirmedAt,
    preparing: null,
    shipped: order.shippedAt,
    completed: order.completedAt,
    cancelled: order.cancelledAt,
  };

  return (
    <ol className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-2">
      {STEP_ORDER.map((step, index) => {
        const reached = index <= currentIndex;
        return (
          <li key={step} className="flex flex-1 items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
            <span
              className={cn(
                "size-2.5 shrink-0 rounded-full",
                reached ? "bg-accent" : "bg-border-strong",
              )}
            />
            <div className="flex flex-col">
              <span
                className={cn(
                  "font-mono text-xs tracking-wide uppercase",
                  reached ? "text-fg-primary" : "text-fg-muted",
                )}
              >
                {STATUS_LABEL[step]}
              </span>
              <span className="text-fg-muted font-mono text-[11px]">
                {formatTimestamp(timestamps[step])}
              </span>
            </div>
            {index < STEP_ORDER.length - 1 ? (
              <span
                className={cn(
                  "hidden h-px flex-1 sm:block",
                  index < currentIndex ? "bg-accent" : "bg-border-strong",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
