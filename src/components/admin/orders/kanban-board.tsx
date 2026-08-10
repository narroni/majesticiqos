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
import { formatPrice } from "@/lib/utils";
import type { OrderStatus } from "@/types";

const COLUMNS: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "completed",
  "cancelled",
];

type Columns = Record<OrderStatus, AdminOrderListItem[]>;

interface KanbanBoardProps {
  columns: Columns;
}

function findOrder(columns: Columns, orderId: string): AdminOrderListItem | undefined {
  for (const status of COLUMNS) {
    const found = columns[status].find((order) => order.id === orderId);
    if (found) return found;
  }
  return undefined;
}

function moveCard(columns: Columns, orderId: string, from: OrderStatus, to: OrderStatus): Columns {
  const order = columns[from].find((item) => item.id === orderId);
  if (!order) return columns;

  return {
    ...columns,
    [from]: columns[from].filter((item) => item.id !== orderId),
    [to]: [{ ...order, status: to }, ...columns[to]],
  };
}

export function KanbanBoard({ columns: initialColumns }: KanbanBoardProps) {
  const [columns, setColumns] = useState(initialColumns);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<{
    order: AdminOrderListItem;
    from: OrderStatus;
  } | null>(null);
  const [, startTransition] = useTransition();

  // New server data (fresh page load / navigation back to /admin/orders)
  // replaces local optimistic state — adjusting state during render on a
  // prop-identity change, same pattern as AdminProductList's selection reset.
  const [knownColumns, setKnownColumns] = useState(initialColumns);
  if (initialColumns !== knownColumns) {
    setKnownColumns(initialColumns);
    setColumns(initialColumns);
  }

  // The server action is the actual authority on legal transitions (it
  // independently re-validates via the change_order_status RPC) — this
  // isn't a client-side gate, just the optimistic-update/revert plumbing
  // around whatever the server decides.
  function applyMove(order: AdminOrderListItem, from: OrderStatus, to: OrderStatus) {
    setColumns((prev) => moveCard(prev, order.id, from, to));

    startTransition(async () => {
      const result = await changeOrderStatus(order.id, to);
      if (!result.success) {
        setColumns((prev) => moveCard(prev, order.id, to, from));
        toast.error(result.error ?? "That move isn't allowed.");
      }
    });
  }

  // Shared by both drag-drop (desktop/mouse) and the status dropdown
  // (mobile/touch, since native HTML5 drag never fires touch events) — one
  // path to a status change regardless of how it was requested.
  function requestStatusChange(order: AdminOrderListItem, target: OrderStatus) {
    if (order.status === target) return;

    if (target === "cancelled") {
      setPendingCancel({ order, from: order.status });
      return;
    }

    applyMove(order, order.status, target);
  }

  function handleDrop(target: OrderStatus, event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const orderId = event.dataTransfer.getData("text/plain");
    if (!orderId) return;

    const order = findOrder(columns, orderId);
    if (!order) return;

    requestStatusChange(order, target);
  }

  return (
    <>
      {/* Below lg: a horizontally-scrollable row, each column a comfortable
          touch-target width — a phone can't show 6 columns side by side
          regardless of how compact the cards get. At lg+: a fixed 6-column
          grid sized to fit a normal desktop viewport with no scrolling. */}
      <div className="flex gap-2 overflow-x-auto pb-2 lg:grid lg:grid-cols-6 lg:gap-2 lg:overflow-visible">
        {COLUMNS.map((status) => (
          <div
            key={status}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(status, event)}
            className="border-border bg-bg-elevated flex w-48 shrink-0 flex-col gap-1.5 rounded-md border p-1.5 lg:w-auto lg:shrink"
          >
            <h3 className="text-fg-muted flex items-center justify-between px-1 font-mono text-[10px] tracking-[0.1em] uppercase">
              <span className="truncate">{STATUS_LABEL[status]}</span>
              <span className="shrink-0">{columns[status].length}</span>
            </h3>

            <div className="flex min-h-8 flex-col gap-1.5">
              {columns[status].map((order) => {
                const nextOptions = getAllowedNextStatuses(order.status);
                const canMove = nextOptions.length > 0;
                const statusItems = Object.fromEntries(
                  [order.status, ...nextOptions].map((option) => [option, STATUS_LABEL[option]]),
                );

                return (
                  <div
                    key={order.id}
                    draggable={canMove}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", order.id);
                      event.dataTransfer.effectAllowed = "move";
                      setDraggingId(order.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    className={cn(
                      "border-border bg-bg-base flex flex-col gap-1 rounded-md border p-2 transition-opacity",
                      canMove ? "lg:cursor-grab lg:active:cursor-grabbing" : "cursor-default",
                      draggingId === order.id && "opacity-40",
                    )}
                  >
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-fg-primary hover:text-accent truncate font-mono text-xs"
                    >
                      {order.orderNumber}
                    </Link>
                    <span className="text-fg-secondary font-body truncate text-xs">
                      {order.firstName} {order.lastName}
                    </span>
                    <span className="text-fg-primary font-mono text-xs">
                      {formatPrice(order.totalCents, "en")}
                    </span>

                    {/* Touch has no drag — this is how a phone changes an
                        order's status instead. Hidden at lg+, where drag is
                        the primary interaction and this would be redundant. */}
                    {canMove ? (
                      <Select
                        value={order.status}
                        onValueChange={(value) =>
                          value && requestStatusChange(order, value as OrderStatus)
                        }
                        items={statusItems}
                      >
                        <SelectTrigger size="sm" className="mt-1 w-full lg:hidden">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={order.status}>{STATUS_LABEL[order.status]}</SelectItem>
                          {nextOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {STATUS_LABEL[option]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <AlertDialog
        open={pendingCancel != null}
        onOpenChange={(open) => !open && setPendingCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel order {pendingCancel?.order.orderNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This restores stock for every item in the order. It can&apos;t be undone from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep order</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
              onClick={() => {
                if (pendingCancel) {
                  applyMove(pendingCancel.order, pendingCancel.from, "cancelled");
                }
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
