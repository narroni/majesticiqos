import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { ClearCartOnConfirmation } from "@/components/checkout/clear-cart-on-confirmation";
import { Container } from "@/components/shared/container";
import { OrderItemThumbnail } from "@/components/shared/order-item-thumbnail";
import { buttonVariants } from "@/components/ui/button-variants";
import { Link } from "@/i18n/navigation";
import { getOrderByPublicToken } from "@/lib/data/orders";
import { requireLocale } from "@/lib/locale";
import { cx, formatPrice } from "@/lib/utils";

// Never cached, never indexed — this URL's only credential is the
// unguessable public_token (BLUEPRINT §8.2), so it must not end up in a
// crawler's index or a shared cache.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface OrderConfirmationPageProps {
  params: Promise<{ locale: string; token: string }>;
}

export default async function OrderConfirmationPage({
  params,
}: OrderConfirmationPageProps) {
  const { locale, token } = await params;
  const currentLocale = requireLocale(locale);

  const order = await getOrderByPublicToken(token);

  if (!order) {
    notFound();
  }

  const [tOrder, tCart] = await Promise.all([
    getTranslations("order"),
    getTranslations("cart"),
  ]);

  return (
    <Container className="flex max-w-2xl flex-col gap-8 py-12 lg:py-16">
      <ClearCartOnConfirmation />

      <div className="flex flex-col gap-3">
        <h1 className="text-h1 font-display text-fg-primary">{tOrder("success")}</h1>
        <p className="text-fg-secondary font-body">{tOrder("contactWindow")}</p>
      </div>

      <div className="border-border bg-bg-elevated flex flex-col gap-4 rounded-md border p-6">
        <div className="flex items-center justify-between">
          <span className="text-fg-muted font-mono text-xs tracking-[0.15em] uppercase">
            {tOrder("orderNumber")}
          </span>
          <span className="text-fg-primary font-mono text-sm">{order.orderNumber}</span>
        </div>

        <div className="border-border flex flex-col gap-3 border-t pt-4">
          <span className="text-fg-muted font-mono text-xs tracking-[0.15em] uppercase">
            {tOrder("items")}
          </span>
          <ul className="flex flex-col gap-3">
            {order.items.map((item, index) => (
              <li key={`${item.productId}-${index}`} className="flex items-center gap-3">
                <OrderItemThumbnail
                  imageUrl={item.imageUrl}
                  alt={currentLocale === "sq" ? item.nameSq : item.nameEn}
                  sizeClassName="size-24 sm:size-60"
                  imageSizes="(min-width: 640px) 240px, 96px"
                />
                <div className="flex flex-1 flex-col">
                  <span className="text-fg-primary font-body line-clamp-1 text-sm">
                    {currentLocale === "sq" ? item.nameSq : item.nameEn}
                  </span>
                  <span className="text-fg-muted font-mono text-xs">×{item.quantity}</span>
                </div>
                <span className="text-fg-secondary font-mono text-sm">
                  {formatPrice(item.lineTotalCents, currentLocale)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <dl className="border-border border-t pt-4 font-mono text-sm">
          <div className="flex items-center justify-between py-1.5">
            <dt className="text-fg-secondary">{tCart("subtotal")}</dt>
            <dd className="text-fg-primary">{formatPrice(order.subtotalCents, currentLocale)}</dd>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <dt className="text-fg-secondary">{tCart("shipping")}</dt>
            <dd className="text-fg-primary">{formatPrice(order.shippingCents, currentLocale)}</dd>
          </div>
          <div className="border-border flex items-center justify-between border-t py-3 text-base">
            <dt className="text-fg-primary">{tOrder("total")}</dt>
            <dd className="text-accent">{formatPrice(order.totalCents, currentLocale)}</dd>
          </div>
        </dl>
      </div>

      <p className="text-fg-muted font-body text-sm">{tOrder("savePage")}</p>

      <Link
        href="/"
        data-slot="button"
        className={cx(buttonVariants({ variant: "outline" }), "self-start")}
      >
        {tOrder("continueShopping")}
      </Link>
    </Container>
  );
}
