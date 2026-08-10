"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { changeOrderStatus } from "@/lib/actions/admin-orders";
import type { AdminOrderListItem } from "@/lib/data/admin-orders";
import { getAllowedNextStatuses, STATUS_LABEL } from "@/lib/order-status";
import { cn } from "@/lib/cn";
import { formatPrice, formatRelativeTime } from "@/lib/utils";
import type { OrderStatus } from "@/types";

const STATUS_BADGE_CLASS: Record<OrderStatus, string> = {
  pending: "border-warning text-warning",
  confirmed: "border-accent text-accent",
  preparing: "border-accent text-accent",
  shipped: "border-accent text-accent",
  completed: "border-success text-success",
  cancelled: "border-danger text-danger",
};

interface AdminOrderListProps {
  orders: AdminOrderListItem[];
}

export function AdminOrderList({ orders }: AdminOrderListProps) {
  const [overrides, setOverrides] = useState<Record<string, OrderStatus>>({});
  const [pendingCancel, setPendingCancel] = useState<AdminOrderListItem | null>(null);
  const [, startTransition] = useTransition();

  function applyStatusChange(order: AdminOrderListItem, next: OrderStatus) {
    const previous = overrides[order.id] ?? order.status;
    setOverrides((prev) => ({ ...prev, [order.id]: next }));

    startTransition(async () => {
      const result = await changeOrderStatus(order.id, next);
      if (!result.success) {
        setOverrides((prev) => ({ ...prev, [order.id]: previous }));
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  function handleSelect(order: AdminOrderListItem, next: OrderStatus) {
    if (next === "cancelled") {
      setPendingCancel(order);
      return;
    }
    applyStatusChange(order, next);
  }

  if (orders.length === 0) {
    return (
      <p className="text-fg-secondary font-body py-12 text-center text-sm">No orders here.</p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {orders.map((order) => {
          const status = overrides[order.id] ?? order.status;
          const nextOptions = getAllowedNextStatuses(status);

          return (
            <div
              key={order.id}
              className="border-border bg-bg-elevated flex flex-col gap-3 rounded-md border p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <Link href={`/admin/orders/${order.id}`} className="flex flex-col gap-0.5">
                  <span className="text-fg-primary font-mono text-sm">{order.orderNumber}</span>
                  <span className="text-fg-secondary font-body text-sm">
                    {order.firstName} {order.lastName}
                  </span>
                </Link>
                <span className="text-fg-muted font-mono text-xs whitespace-nowrap">
                  {formatRelativeTime(order.createdAt)}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <a
                    href={`tel:${order.phone}`}
                    onClick={(event) => event.stopPropagation()}
                    className="text-accent font-mono hover:underline"
                  >
                    {order.phone}
                  </a>
                  <span className="text-fg-secondary font-body">
                    {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                  </span>
                  <span className="text-fg-primary font-mono">
                    {formatPrice(order.totalCents, "en")}
                  </span>
                </div>

                {nextOptions.length === 0 ? (
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 font-mono text-xs",
                      STATUS_BADGE_CLASS[status],
                    )}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                ) : (
                  <Select
                    value={status}
                    onValueChange={(value) => value && handleSelect(order, value as OrderStatus)}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={status}>{STATUS_LABEL[status]}</SelectItem>
                      {nextOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {STATUS_LABEL[option]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={pendingCancel != null} onOpenChange={(open) => !open && setPendingCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel order {pendingCancel?.orderNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This restores stock for every item in the order. It can&apos;t be undone from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep order</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
              onClick={() => {
                if (pendingCancel) applyStatusChange(pendingCancel, "cancelled");
                setPendingCancel(null);
              }}
            >
              Cancel order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
