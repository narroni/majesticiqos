import type { Tables } from "@/types/database";
import type { ShippingRate } from "@/types";

// Not server-only on purpose: the client-side cart needs the exact same
// math to display totals as the server uses to recompute them authoritatively
// at checkout. Integer cents throughout — never floats.

type ProductPriceFields = Pick<
  Tables<"products">,
  "price_cents" | "discount_price_cents"
>;

export function getEffectivePrice(product: ProductPriceFields): number {
  return product.discount_price_cents ?? product.price_cents;
}

export function getDiscountPercentage(
  product: ProductPriceFields,
): number | null {
  if (product.discount_price_cents == null) {
    return null;
  }

  return Math.round(
    ((product.price_cents - product.discount_price_cents) /
      product.price_cents) *
      100,
  );
}

export interface PricingLineItem {
  unitPriceCents: number;
  quantity: number;
}

export function getLineTotal(unitPriceCents: number, quantity: number): number {
  return unitPriceCents * quantity;
}

export function calculateSubtotal(items: PricingLineItem[]): number {
  return items.reduce(
    (sum, item) => sum + getLineTotal(item.unitPriceCents, item.quantity),
    0,
  );
}

export function calculateTotal(
  subtotalCents: number,
  shippingCents: number,
): number {
  return subtotalCents + shippingCents;
}

export function getShippingCost(
  rate: Pick<ShippingRate, "rateCents" | "freeShippingThresholdCents"> | null,
  subtotalCents: number,
): number {
  if (!rate) {
    return 0;
  }

  if (
    rate.freeShippingThresholdCents != null &&
    subtotalCents >= rate.freeShippingThresholdCents
  ) {
    return 0;
  }

  return rate.rateCents;
}
