"use client";

import { useRouter } from "next/navigation";
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
import { getAllowedNextStatuses, STATUS_LABEL } from "@/lib/order-status";
import type { OrderStatus } from "@/types";

interface OrderStatusChangerProps {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
}

export function OrderStatusChanger({ orderId, orderNumber, status }: OrderStatusChangerProps) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [, startTransition] = useTransition();

  const nextOptions = getAllowedNextStatuses(current);

  function apply(next: OrderStatus) {
    const previous = current;
    setCurrent(next);

    startTransition(async () => {
      const result = await changeOrderStatus(orderId, next);
      if (!result.success) {
        setCurrent(previous);
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success(`Marked as ${STATUS_LABEL[next]}.`);
      // The RPC's own trigger-set timestamps (confirmed_at, sales_count,
      // restored stock) live server-side only — refresh to reflect them
      // once the optimistic update above has already shown instantly.
      router.refresh();
    });
  }

  function handleChange(next: OrderStatus) {
    if (next === "cancelled") {
      setConfirmingCancel(true);
      return;
    }
    apply(next);
  }

  if (nextOptions.length === 0) {
    return (
      <span className="text-fg-muted font-mono text-sm">
        {STATUS_LABEL[current]} — no further changes possible
      </span>
    );
  }

  // See sort-select.tsx's comment — Select.Value needs this `items` map to
  // show the matched label instead of the raw status value on the closed
  // trigger.
  const items = Object.fromEntries(
    [current, ...nextOptions].map((option) => [option, STATUS_LABEL[option]]),
  );

  return (
    <>
      <Select
        value={current}
        onValueChange={(value) => value && handleChange(value as OrderStatus)}
        items={items}
      >
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={current}>{STATUS_LABEL[current]}</SelectItem>
          {nextOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {STATUS_LABEL[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AlertDialog open={confirmingCancel} onOpenChange={setConfirmingCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel order {orderNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This restores stock for every item in the order. It can&apos;t be undone from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep order</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
              onClick={() => {
                apply("cancelled");
                setConfirmingCancel(false);
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
