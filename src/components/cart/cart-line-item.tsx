"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";

import { QuantityStepper } from "@/components/product/quantity-stepper";
import type { ReconciliationResult } from "@/lib/cart-reconciliation";
import { Link } from "@/i18n/navigation";
import { useCartStore, type CartItem } from "@/lib/stores/cart-store";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/utils";
import type { Locale } from "@/types";

interface CartLineItemProps {
  item: CartItem;
  locale: Locale;
  /** Only supplied on the cart page — the drawer renders the cached
   * snapshot instantly and never fetches. */
  reconciliation?: ReconciliationResult;
}

export function CartLineItem({ item, locale, reconciliation }: CartLineItemProps) {
  const t = useTranslations("cart");
  const removeItem = useCartStore((state) => state.removeItem);
  const setQuantity = useCartStore((state) => state.setQuantity);

  const isUnavailable = reconciliation?.status === "unavailable";
  const isOutOfStock = reconciliation?.status === "out_of_stock";
  const isQuantityReduced = reconciliation?.status === "quantity_reduced";
  const isPriceChanged = reconciliation?.status === "price_changed";

  const currentPriceCents = reconciliation?.product?.effectivePriceCents ?? item.priceCents;
  const maxQuantity = reconciliation?.product?.stockQuantity ?? Number.MAX_SAFE_INTEGER;
  const canAdjustQuantity = !isUnavailable && !isOutOfStock;

  return (
    <div className={cn("flex gap-4", isUnavailable && "opacity-50")}>
      <div className="bg-bg-elevated relative h-20 w-16 shrink-0 overflow-hidden rounded-sm">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <Link
          href={`/products/${item.slug}`}
          className="text-fg-primary font-body line-clamp-2 text-sm hover:underline"
        >
          {item.name}
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-accent font-mono text-sm">
            {formatPrice(currentPriceCents, locale)}
          </span>
          {isPriceChanged && (
            <span className="text-fg-muted font-mono text-xs line-through">
              {formatPrice(item.priceCents, locale)}
            </span>
          )}
        </div>

        {isPriceChanged && (
          <p className="text-warning font-body text-xs">{t("priceUpdated")}</p>
        )}
        {isOutOfStock && (
          <p className="text-danger font-body text-xs">{t("outOfStockNotice")}</p>
        )}
        {isUnavailable && (
          <p className="text-danger font-body text-xs">{t("noLongerAvailable")}</p>
        )}
        {isQuantityReduced && reconciliation?.product && (
          <p className="text-warning font-body text-xs">
            {t("quantityAdjusted", { quantity: reconciliation.product.stockQuantity })}
          </p>
        )}

        <div className="mt-1 flex items-center justify-between gap-3">
          {canAdjustQuantity ? (
            <QuantityStepper
              quantity={item.quantity}
              max={maxQuantity}
              onChange={(quantity) => setQuantity(item.productId, quantity)}
            />
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => removeItem(item.productId)}
            // Real padding on touch devices only (mobile audit: 52x15px is
            // far under the 44px minimum) — negative margin cancels the
            // padding's effect on the row's layout, so "Remove" doesn't
            // visually shift or push the stepper further left, it just
            // gains a bigger, invisible-until-tapped touch target around
            // the same text. Desktop keeps the current compact underlined
            // link untouched (pointer: fine is precise enough as-is).
            className="text-fg-muted hover:text-danger font-body text-xs underline pointer-coarse:-mx-3 pointer-coarse:-my-3 pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center pointer-coarse:justify-center pointer-coarse:rounded-sm pointer-coarse:px-3 pointer-coarse:py-3"
          >
            {t("remove")}
          </button>
        </div>
      </div>
    </div>
  );
}
