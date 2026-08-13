import type { ShippingRate } from "@/types";

// Not server-only on purpose: the client-side cart needs the exact same
// math to display totals as the server uses to recompute them authoritatively
// at checkout. Integer cents throughout — never floats.

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
