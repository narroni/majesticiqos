import { notFound } from "next/navigation";

import { CopyAddressButton } from "@/components/admin/orders/copy-address-button";
import { OrderNoteForm } from "@/components/admin/orders/order-note-form";
import { OrderStatusChanger } from "@/components/admin/orders/order-status-changer";
import { OrderStatusStepper } from "@/components/admin/orders/order-status-stepper";
import { OrderItemThumbnail } from "@/components/shared/order-item-thumbnail";
import { COUNTRY_LABEL } from "@/lib/country-labels";
import { getAdminOrderById } from "@/lib/data/admin-orders";
import { formatAdminDateTime, formatPrice } from "@/lib/utils";
import type { Locale } from "@/types";

const LOCALE_LABEL: Record<Locale, string> = {
  sq: "Albanian",
  en: "English",
};

interface AdminOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const { id } = await params;
  const order = await getAdminOrderById(id);

  if (!order) {
    notFound();
  }

  const fullAddress = [order.addressLine, order.postalCode, order.city, COUNTRY_LABEL[order.country]]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-h2 font-display text-fg-primary">{order.orderNumber}</h1>
          <span className="text-fg-muted font-mono text-xs">
            Placed {formatAdminDateTime(order.createdAt)}
          </span>
        </div>
        <OrderStatusChanger orderId={order.id} orderNumber={order.orderNumber} status={order.status} />
      </div>

      <div className="border-border bg-bg-elevated rounded-md border p-5">
        <OrderStatusStepper order={order} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="border-border bg-bg-elevated flex flex-col gap-3 rounded-md border p-5">
          <h2 className="text-fg-primary font-display text-lg">Customer</h2>
          <div className="flex flex-col gap-1">
            <span className="text-fg-primary font-body text-sm">
              {order.firstName} {order.lastName}
            </span>
            <a href={`tel:${order.phone}`} className="text-accent font-mono text-sm hover:underline">
              {order.phone}
            </a>
            {order.email ? (
              <span className="text-fg-secondary font-body text-sm">{order.email}</span>
            ) : null}
          </div>

          <div className="border-border flex flex-col gap-2 border-t pt-3">
            <span className="text-fg-secondary font-body text-sm">{fullAddress}</span>
            <CopyAddressButton address={fullAddress} />
          </div>

          <div className="border-border flex items-center justify-between border-t pt-3">
            <span className="text-fg-muted font-mono text-xs tracking-[0.1em] uppercase">
              Order language
            </span>
            <span className="text-fg-primary font-body text-sm">{LOCALE_LABEL[order.locale]}</span>
          </div>

          {order.customerNote ? (
            <div className="border-border flex flex-col gap-1 border-t pt-3">
              <span className="text-fg-muted font-mono text-xs tracking-[0.1em] uppercase">
                Customer note
              </span>
              <p className="text-fg-secondary font-body text-sm">{order.customerNote}</p>
            </div>
          ) : null}
        </div>

        <div className="border-border bg-bg-elevated flex flex-col gap-4 rounded-md border p-5">
          <h2 className="text-fg-primary font-display text-lg">Totals</h2>
          <dl className="font-mono text-sm">
            <div className="flex items-center justify-between py-1.5">
              <dt className="text-fg-secondary">Subtotal</dt>
              <dd className="text-fg-primary">{formatPrice(order.subtotalCents, "en")}</dd>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <dt className="text-fg-secondary">
                Shipping <span className="text-fg-muted">({COUNTRY_LABEL[order.country]})</span>
              </dt>
              <dd className="text-fg-primary">{formatPrice(order.shippingCents, "en")}</dd>
            </div>
            <div className="border-border flex items-center justify-between border-t py-3 text-base">
              <dt className="text-fg-primary">Total</dt>
              <dd className="text-accent">{formatPrice(order.totalCents, "en")}</dd>
            </div>
          </dl>

          <div className="border-border border-t pt-4">
            <OrderNoteForm orderId={order.id} initialNote={order.adminNote ?? ""} />
          </div>
        </div>
      </div>

      <div className="border-border bg-bg-elevated flex flex-col gap-4 rounded-md border p-5">
        <h2 className="text-fg-primary font-display text-lg">Items</h2>
        <ul className="flex flex-col gap-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <OrderItemThumbnail
                imageUrl={item.imageUrl}
                alt={item.name}
                sizeClassName="size-28 sm:size-[280px]"
                imageSizes="(min-width: 640px) 280px, 112px"
              />
              <div className="flex flex-1 flex-col">
                <span className="text-fg-primary font-body text-sm">{item.name}</span>
                <span className="text-fg-muted font-mono text-xs">
                  {formatPrice(item.unitPriceCents, "en")} × {item.quantity}
                </span>
              </div>
              <span className="text-fg-primary font-mono text-sm">
                {formatPrice(item.lineTotalCents, "en")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
