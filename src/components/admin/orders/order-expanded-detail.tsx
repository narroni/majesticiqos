"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { OrderItemThumbnail } from "@/components/shared/order-item-thumbnail";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateOrderNote } from "@/lib/actions/admin-orders";
import type { AdminOrderRow } from "@/lib/data/admin-orders";
import { COUNTRY_LABEL } from "@/lib/country-labels";
import { formatPrice } from "@/lib/utils";

const NOTE_MAX_LENGTH = 2000;

// Shared by both the desktop table row's expanded <tr> and the mobile
// card's expanded panel — same content either way, just a different wrapper
// around it (see admin-order-table.tsx).
export function OrderExpandedDetail({ order }: { order: AdminOrderRow }) {
  const [note, setNote] = useState(order.adminNote ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSaveNote() {
    startTransition(async () => {
      const result = await updateOrderNote(order.id, note);
      if (result.success) {
        toast.success("Note saved.");
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <span className="text-fg-muted font-mono text-xs tracking-[0.1em] uppercase">
            Delivery address
          </span>
          <p className="text-fg-secondary font-body text-sm">
            {order.addressLine}
            <br />
            {order.city}
            {order.postalCode ? `, ${order.postalCode}` : ""}
            <br />
            {COUNTRY_LABEL[order.country]}
          </p>
        </div>

        {order.customerNote ? (
          <div className="flex flex-col gap-1">
            <span className="text-fg-muted font-mono text-xs tracking-[0.1em] uppercase">
              Customer note
            </span>
            <p className="text-fg-secondary font-body text-sm">{order.customerNote}</p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-fg-muted font-mono text-xs tracking-[0.1em] uppercase">Items</span>
        <ul className="flex flex-col gap-1.5">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <OrderItemThumbnail
                  imageUrl={item.imageUrl}
                  alt={item.name}
                  sizeClassName="size-16 sm:size-40"
                  imageSizes="(min-width: 640px) 160px, 64px"
                />
                <span className="text-fg-secondary font-body truncate">
                  {item.name} <span className="text-fg-muted font-mono text-xs">×{item.quantity}</span>
                </span>
              </div>
              <span className="text-fg-primary font-mono shrink-0">
                {formatPrice(item.lineTotalCents, "en")}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <dl className="border-border flex flex-col gap-1 border-t pt-3 font-mono text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-fg-secondary">Subtotal</dt>
          <dd className="text-fg-primary">{formatPrice(order.subtotalCents, "en")}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-fg-secondary">Shipping</dt>
          <dd className="text-fg-primary">{formatPrice(order.shippingCents, "en")}</dd>
        </div>
        <div className="flex items-center justify-between text-base">
          <dt className="text-fg-primary">Total</dt>
          <dd className="text-accent">{formatPrice(order.totalCents, "en")}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <span className="text-fg-muted font-mono text-xs tracking-[0.1em] uppercase">
          Internal note
        </span>
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={NOTE_MAX_LENGTH}
          rows={2}
          placeholder="Not visible to the customer."
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="self-start"
          disabled={isPending}
          onClick={handleSaveNote}
        >
          {isPending ? "Saving…" : "Save note"}
        </Button>
      </div>
    </div>
  );
}
