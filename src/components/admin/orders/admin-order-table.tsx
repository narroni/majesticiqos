"use client";

import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { Fragment, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/admin/orders/delete-confirm-dialog";
import { OrderExpandedDetail } from "@/components/admin/orders/order-expanded-detail";
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
import { changeOrderStatus, deleteOrder, deleteOrders } from "@/lib/actions/admin-orders";
import type { AdminOrderRow } from "@/lib/data/admin-orders";
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

function stopRowToggle(event: React.SyntheticEvent) {
  event.stopPropagation();
}

interface AdminOrderTableProps {
  orders: AdminOrderRow[];
}

export function AdminOrderTable({ orders: initialOrders }: AdminOrderTableProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingCancel, setPendingCancel] = useState<AdminOrderRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminOrderRow | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [, startTransition] = useTransition();

  // New page/filter/status-tab data replaces local state — adjusting state
  // during render on a prop-identity change, same pattern used by
  // AdminProductList and KanbanBoard.
  const [knownOrders, setKnownOrders] = useState(initialOrders);
  if (initialOrders !== knownOrders) {
    setKnownOrders(initialOrders);
    setOrders(initialOrders);
    setExpandedId(null);
    setSelectedIds(new Set());
  }

  const isAllSelected = orders.length > 0 && orders.every((order) => selectedIds.has(order.id));
  const isPartiallySelected = selectedIds.size > 0 && !isAllSelected;

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? new Set(orders.map((order) => order.id)) : new Set());
  }

  function toggleSelectOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleExpand(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  function applyStatusChange(order: AdminOrderRow, next: OrderStatus) {
    const previous = order.status;
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: next } : o)));

    startTransition(async () => {
      const result = await changeOrderStatus(order.id, next);
      if (!result.success) {
        setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: previous } : o)));
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  function handleStatusSelect(order: AdminOrderRow, next: OrderStatus) {
    if (next === "cancelled") {
      setPendingCancel(order);
      return;
    }
    applyStatusChange(order, next);
  }

  async function handleDeleteOne() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const result = await deleteOrder(deleteTarget.id);
    setIsDeleting(false);

    if (result.success) {
      setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      setExpandedId((current) => (current === deleteTarget.id ? null : current));
      toast.success(`Order ${deleteTarget.orderNumber} deleted.`);
      setDeleteTarget(null);
    } else {
      toast.error(result.error ?? "Something went wrong.");
    }
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    setIsDeleting(true);
    const result = await deleteOrders(ids);
    setIsDeleting(false);

    if (result.success) {
      const removed = new Set(result.deletedIds ?? ids);
      setOrders((prev) => prev.filter((o) => !removed.has(o.id)));
      setExpandedId((current) => (current && removed.has(current) ? null : current));
      setSelectedIds(new Set());
      toast.success(`${removed.size} ${removed.size === 1 ? "order" : "orders"} deleted.`);
      setIsBulkDeleteOpen(false);
    } else {
      toast.error(result.error ?? "Something went wrong.");
    }
  }

  if (orders.length === 0) {
    return <p className="text-fg-secondary font-body py-12 text-center text-sm">No orders here.</p>;
  }

  function statusCell(order: AdminOrderRow) {
    const nextOptions = getAllowedNextStatuses(order.status);
    if (nextOptions.length === 0) {
      return (
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 font-mono text-xs whitespace-nowrap",
            STATUS_BADGE_CLASS[order.status],
          )}
        >
          {STATUS_LABEL[order.status]}
        </span>
      );
    }

    const items = Object.fromEntries(
      [order.status, ...nextOptions].map((option) => [option, STATUS_LABEL[option]]),
    );

    return (
      <Select
        value={order.status}
        onValueChange={(value) => value && handleStatusSelect(order, value as OrderStatus)}
        items={items}
      >
        <SelectTrigger className="w-36" onClick={stopRowToggle}>
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
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {selectedIds.size > 0 ? (
        <div className="border-accent bg-accent/10 flex items-center justify-between gap-4 rounded-md border px-4 py-2.5">
          <span className="text-fg-primary font-body text-sm">
            {selectedIds.size} {selectedIds.size === 1 ? "order" : "orders"} selected
          </span>
          <Button variant="outline" size="sm" onClick={() => setIsBulkDeleteOpen(true)}>
            <Trash2 />
            Delete selected
          </Button>
        </div>
      ) : null}

      {/* Desktop table */}
      <div className="border-border hidden overflow-hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isPartiallySelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all orders"
                />
              </TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <Fragment key={order.id}>
                <TableRow
                  onClick={() => toggleExpand(order.id)}
                  className="cursor-pointer"
                >
                  <TableCell onClick={stopRowToggle}>
                    <Checkbox
                      checked={selectedIds.has(order.id)}
                      onCheckedChange={(checked) => toggleSelectOne(order.id, checked)}
                      aria-label={`Select order ${order.orderNumber}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {expandedId === order.id ? (
                        <ChevronDown className="text-fg-muted size-3.5 shrink-0" />
                      ) : (
                        <ChevronRight className="text-fg-muted size-3.5 shrink-0" />
                      )}
                      <Link
                        href={`/admin/orders/${order.id}`}
                        onClick={stopRowToggle}
                        className="text-fg-primary hover:text-accent font-mono text-sm"
                      >
                        {order.orderNumber}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="text-fg-secondary">
                    {order.firstName} {order.lastName}
                  </TableCell>
                  <TableCell>
                    <a
                      href={`tel:${order.phone}`}
                      onClick={stopRowToggle}
                      className="text-accent font-mono text-xs hover:underline"
                    >
                      {order.phone}
                    </a>
                  </TableCell>
                  <TableCell className="text-fg-secondary">{order.city}</TableCell>
                  <TableCell className="text-fg-secondary">{order.itemCount}</TableCell>
                  <TableCell className="text-fg-primary font-mono">
                    {formatPrice(order.totalCents, "en")}
                  </TableCell>
                  <TableCell onClick={stopRowToggle}>{statusCell(order)}</TableCell>
                  <TableCell className="text-fg-muted font-mono text-xs whitespace-nowrap">
                    {formatRelativeTime(order.createdAt)}
                  </TableCell>
                  <TableCell onClick={stopRowToggle}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Delete order"
                      onClick={() => setDeleteTarget(order)}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
                {expandedId === order.id ? (
                  <TableRow>
                    <TableCell colSpan={10} className="bg-bg-base">
                      <OrderExpandedDetail order={order} />
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile stacked cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {orders.map((order) => (
          <div key={order.id} className="border-border bg-bg-elevated overflow-hidden rounded-md border">
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleExpand(order.id)}
              className="flex cursor-pointer flex-col gap-2 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span onClick={stopRowToggle}>
                    <Checkbox
                      checked={selectedIds.has(order.id)}
                      onCheckedChange={(checked) => toggleSelectOne(order.id, checked)}
                      aria-label={`Select order ${order.orderNumber}`}
                    />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      onClick={stopRowToggle}
                      className="text-fg-primary font-mono text-sm"
                    >
                      {order.orderNumber}
                    </Link>
                    <span className="text-fg-secondary font-body text-sm">
                      {order.firstName} {order.lastName}
                    </span>
                  </div>
                </div>
                <span className="text-fg-muted font-mono text-xs whitespace-nowrap">
                  {formatRelativeTime(order.createdAt)}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <a
                    href={`tel:${order.phone}`}
                    onClick={stopRowToggle}
                    className="text-accent font-mono hover:underline"
                  >
                    {order.phone}
                  </a>
                  <span className="text-fg-secondary font-body">{order.city}</span>
                  <span className="text-fg-secondary font-body">
                    {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                  </span>
                  <span className="text-fg-primary font-mono">
                    {formatPrice(order.totalCents, "en")}
                  </span>
                </div>
                <span onClick={stopRowToggle}>{statusCell(order)}</span>
              </div>
            </div>

            {expandedId === order.id ? (
              <div className="border-border bg-bg-base border-t p-4">
                <OrderExpandedDetail order={order} />
                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={(event) => {
                      stopRowToggle(event);
                      setDeleteTarget(order);
                    }}
                  >
                    <Trash2 />
                    Delete order
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <DeleteConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete order ${deleteTarget?.orderNumber}?`}
        description="This permanently removes the order and its sales history. It cannot be undone."
        confirmText={deleteTarget?.orderNumber ?? ""}
        confirmLabel="This can't be undone"
        isPending={isDeleting}
        onConfirm={handleDeleteOne}
      />

      <DeleteConfirmDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        title={`Delete ${selectedIds.size} ${selectedIds.size === 1 ? "order" : "orders"}?`}
        description="This permanently removes these orders and their sales history. It cannot be undone."
        confirmText="DELETE"
        confirmLabel="This can't be undone"
        isPending={isDeleting}
        onConfirm={handleBulkDelete}
      />

      <AlertDialog
        open={pendingCancel != null}
        onOpenChange={(open) => !open && setPendingCancel(null)}
      >
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
    </div>
  );
}
