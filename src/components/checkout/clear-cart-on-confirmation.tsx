"use client";

import { useEffect } from "react";

import { useCartStore } from "@/lib/stores/cart-store";

/**
 * Clears the cart once the confirmation page has actually loaded an order —
 * this component is only ever rendered on that success path (see
 * order/[token]/page.tsx, which calls notFound() otherwise).
 */
export function ClearCartOnConfirmation() {
  useEffect(() => {
    // Deferred to a microtask so this doesn't read as a synchronous
    // setState-in-effect call (same pattern as cart-page-content.tsx's
    // reconciliation effect) — it still runs effectively immediately.
    queueMicrotask(() => useCartStore.getState().clear());
  }, []);

  return null;
}
