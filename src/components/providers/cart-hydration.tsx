"use client";

import { useEffect } from "react";

import { useCartStore } from "@/lib/stores/cart-store";

/**
 * Fires the store's manual rehydration once on mount (see cart-store.ts's
 * `skipHydration`). Renders nothing — this only exists to run the effect.
 */
export function CartHydration() {
  useEffect(() => {
    void useCartStore.persist.rehydrate();
  }, []);

  return null;
}
