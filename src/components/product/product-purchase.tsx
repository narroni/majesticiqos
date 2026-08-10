"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { QuantityStepper } from "@/components/product/quantity-stepper";
import { buttonVariants } from "@/components/ui/button-variants";
import { useCartStore } from "@/lib/stores/cart-store";
import { cx, formatPrice } from "@/lib/utils";
import type { Locale, ProductDetail } from "@/types";

interface ProductPurchaseProps {
  product: ProductDetail;
  locale: Locale;
}

/**
 * Quantity selector + add-to-cart, plus the sticky mobile bar that mirrors
 * it once the inline button scrolls out of view. Both share one quantity
 * value so they can't disagree.
 */
export function ProductPurchase({ product, locale }: ProductPurchaseProps) {
  const t = useTranslations("product");
  const tCommon = useTranslations("common");
  const isOutOfStock = product.stockStatus === "out_of_stock";
  const maxQuantity = Math.max(1, product.stockQuantity);

  const addItem = useCartStore((state) => state.addItem);
  const openDrawer = useCartStore((state) => state.openDrawer);

  const [quantity, setQuantity] = useState(1);
  const [isStickyVisible, setIsStickyVisible] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsStickyVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function handleAddToCart() {
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        imageUrl: product.primaryImage?.storagePath ?? null,
        priceCents: product.effectivePriceCents,
      },
      quantity,
    );
    openDrawer();
    setQuantity(1);
  }

  // Plain <button> styled with buttonVariants, not Base UI's <Button> — a
  // native button with a disabled state needs nothing a primitive library
  // adds (BLUEPRINT §9.4 bundle audit); this is above the fold on every
  // product page, so it's part of every cold load.
  function renderAddToCartButton() {
    return (
      <button
        type="button"
        data-slot="button"
        className={cx(buttonVariants({ size: "lg" }), "flex-1")}
        disabled={isOutOfStock}
        onClick={handleAddToCart}
      >
        {isOutOfStock ? t("outOfStock") : tCommon("addToCart")}
      </button>
    );
  }

  return (
    <>
      <div ref={anchorRef} className="flex items-center gap-3">
        {!isOutOfStock && (
          <QuantityStepper
            quantity={quantity}
            max={maxQuantity}
            onChange={setQuantity}
          />
        )}
        {renderAddToCartButton()}
      </div>

      <div
        className={cx(
          "border-border bg-bg-elevated fixed inset-x-0 bottom-0 z-40 flex items-center gap-4 border-t px-4 py-3 shadow-lg transition-transform duration-200 lg:hidden",
          isStickyVisible
            ? "translate-y-0"
            : "pointer-events-none translate-y-full",
        )}
      >
        <div className="flex flex-col">
          <span className="text-accent font-mono text-base">
            {formatPrice(product.effectivePriceCents, locale)}
          </span>
          {product.discountPriceCents != null && (
            <span className="text-fg-muted font-mono text-xs line-through">
              {formatPrice(product.priceCents, locale)}
            </span>
          )}
        </div>
        {renderAddToCartButton()}
      </div>
    </>
  );
}
