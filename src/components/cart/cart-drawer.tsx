"use client";

import { useLocale, useTranslations } from "next-intl";

import { CartLineItem } from "@/components/cart/cart-line-item";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import { calculateSubtotal } from "@/lib/pricing";
import { useCartStore } from "@/lib/stores/cart-store";
import { formatPrice } from "@/lib/utils";
import type { Locale } from "@/types";

export function CartDrawer() {
  const t = useTranslations("cart");
  const locale = useLocale() as Locale;

  const isOpen = useCartStore((state) => state.isDrawerOpen);
  const closeDrawer = useCartStore((state) => state.closeDrawer);
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state.hasHydrated);

  const subtotalCents = calculateSubtotal(
    items.map((item) => ({ unitPriceCents: item.priceCents, quantity: item.quantity })),
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeDrawer()}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0">
        <SheetHeader className="border-border border-b">
          <SheetTitle>{t("title")}</SheetTitle>
        </SheetHeader>

        {!hasHydrated ? (
          <div className="flex flex-1 flex-col gap-4 p-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
            <p className="text-fg-secondary font-body text-sm">{t("empty")}</p>
            <Button
              render={<Link href="/products" onClick={closeDrawer} />}
              nativeButton={false}
            >
              {t("continueShopping")}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              {items.map((item) => (
                <CartLineItem key={item.productId} item={item} locale={locale} />
              ))}
            </div>

            <SheetFooter className="border-border gap-3 border-t">
              <div className="flex items-center justify-between font-mono text-sm">
                <span className="text-fg-secondary">{t("subtotal")}</span>
                <span className="text-fg-primary">
                  {formatPrice(subtotalCents, locale)}
                </span>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  render={<Link href="/cart" onClick={closeDrawer} />}
                  nativeButton={false}
                >
                  {t("goToCart")}
                </Button>
                <Button
                  className="flex-1"
                  render={<Link href="/checkout" onClick={closeDrawer} />}
                  nativeButton={false}
                >
                  {t("checkoutButton")}
                </Button>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
