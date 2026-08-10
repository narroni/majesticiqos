"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { CartLineItem } from "@/components/cart/cart-line-item";
import { CartSummary } from "@/components/cart/cart-summary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { reconcileCart } from "@/lib/actions/reconcile-cart";
import {
  isCheckoutBlocked,
  reconcileCartItem,
  type ReconciliationResult,
} from "@/lib/cart-reconciliation";
import { calculateSubtotal } from "@/lib/pricing";
import { useCartStore } from "@/lib/stores/cart-store";
import type { Locale, ShippingRate } from "@/types";

interface CartPageContentProps {
  locale: Locale;
  shippingRates: ShippingRate[];
}

export function CartPageContent({ locale, shippingRates }: CartPageContentProps) {
  const t = useTranslations("cart");
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state.hasHydrated);

  const [reconciliation, setReconciliation] = useState<
    Record<string, ReconciliationResult>
  >({});
  // Starts true and only ever flips inside the fetch's `.then` below. When
  // the cart is empty the component returns its empty state before this
  // value is ever read, so leaving it "stuck" true on that path is harmless.
  const [isReconciling, setIsReconciling] = useState(true);
  const hasReconciledRef = useRef(false);

  // Reconciliation runs once per cart-page visit, not reactively on every
  // store change — otherwise the clamp below (setQuantity) would re-trigger
  // this effect and immediately overwrite the very flags it just set.
  useEffect(() => {
    if (!hasHydrated || hasReconciledRef.current) return;
    hasReconciledRef.current = true;

    const currentItems = useCartStore.getState().items;
    if (currentItems.length === 0) {
      return;
    }

    reconcileCart({
      productIds: currentItems.map((item) => item.productId),
      locale,
    }).then((productMap) => {
      const results: Record<string, ReconciliationResult> = {};
      for (const item of currentItems) {
        results[item.productId] = reconcileCartItem(item, productMap[item.productId]);
      }
      setReconciliation(results);
      setIsReconciling(false);

      for (const item of currentItems) {
        const result = results[item.productId];
        if (result.status === "quantity_reduced" && result.product) {
          useCartStore.getState().setQuantity(item.productId, result.product.stockQuantity);
        }
      }
    });
  }, [hasHydrated, locale]);

  if (!hasHydrated) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-fg-secondary font-body">{t("empty")}</p>
        <Button render={<Link href="/products" />} nativeButton={false}>
          {t("continueShopping")}
        </Button>
      </div>
    );
  }

  const purchasableItems = items.filter(
    (item) => reconciliation[item.productId]?.status !== "unavailable",
  );
  const subtotalCents = calculateSubtotal(
    purchasableItems.map((item) => ({
      unitPriceCents: reconciliation[item.productId]?.product?.effectivePriceCents ?? item.priceCents,
      quantity: item.quantity,
    })),
  );
  const checkoutDisabled = isReconciling || isCheckoutBlocked(reconciliation);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        {isReconciling ? (
          <p className="text-fg-muted font-mono text-xs">{t("reconciling")}</p>
        ) : null}
        {items.map((item) => (
          <CartLineItem
            key={item.productId}
            item={item}
            locale={locale}
            reconciliation={reconciliation[item.productId]}
          />
        ))}
      </div>

      <CartSummary
        subtotalCents={subtotalCents}
        shippingRates={shippingRates}
        locale={locale}
        checkoutDisabled={checkoutDisabled}
      />
    </div>
  );
}
