"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useFormContext, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { calculateSubtotal, calculateTotal, getLineTotal, getShippingCost } from "@/lib/pricing";
import { useCartStore } from "@/lib/stores/cart-store";
import { formatPrice } from "@/lib/utils";
import type { CheckoutFormValues } from "@/lib/validation/checkout";
import type { Locale, ShippingRate } from "@/types";

interface CheckoutSummaryProps {
  shippingRates: ShippingRate[];
  locale: Locale;
  isSubmitting: boolean;
}

export function CheckoutSummary({ shippingRates, locale, isSubmitting }: CheckoutSummaryProps) {
  const t = useTranslations("cart");
  const tCheckout = useTranslations("checkout");
  const items = useCartStore((state) => state.items);
  const { control } = useFormContext<CheckoutFormValues>();
  const country = useWatch({ control, name: "country" });

  const subtotalCents = calculateSubtotal(
    items.map((item) => ({ unitPriceCents: item.priceCents, quantity: item.quantity })),
  );
  const rate = shippingRates.find((r) => r.country === country) ?? null;
  const shippingCents = getShippingCost(rate, subtotalCents);
  const totalCents = calculateTotal(subtotalCents, shippingCents);

  return (
    <div className="flex h-fit flex-col gap-5 lg:sticky lg:top-24">
      <div className="border-border bg-bg-elevated flex flex-col gap-4 rounded-md border p-6">
        <h2 className="font-display text-fg-primary text-lg">{tCheckout("orderSummary")}</h2>

        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.productId} className="flex items-center gap-3">
              <div className="bg-bg-subtle relative h-14 w-12 shrink-0 overflow-hidden rounded-sm">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-fg-primary font-body line-clamp-1 text-sm">
                  {item.name}
                </span>
                <span className="text-fg-muted font-mono text-xs">×{item.quantity}</span>
              </div>
              <span className="text-fg-secondary font-mono text-sm">
                {formatPrice(getLineTotal(item.priceCents, item.quantity), locale)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="border-border border-t pt-4 font-mono text-sm">
          <div className="flex items-center justify-between py-1.5">
            <dt className="text-fg-secondary">{t("subtotal")}</dt>
            <dd className="text-fg-primary">{formatPrice(subtotalCents, locale)}</dd>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <dt className="text-fg-secondary">{t("shipping")}</dt>
            <dd className="text-fg-primary">
              {rate ? formatPrice(shippingCents, locale) : t("selectCountry")}
            </dd>
          </div>
          <div className="border-border flex items-center justify-between border-t py-3 text-base">
            <dt className="text-fg-primary">{t("total")}</dt>
            <dd className="text-accent">{formatPrice(totalCents, locale)}</dd>
          </div>
        </dl>

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? tCheckout("submitting") : tCheckout("submit")}
        </Button>
      </div>
    </div>
  );
}
