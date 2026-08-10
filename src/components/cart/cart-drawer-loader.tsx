"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { useCartStore } from "@/lib/stores/cart-store";

const CartDrawer = dynamic(
  () => import("@/components/cart/cart-drawer").then((mod) => mod.CartDrawer),
  { ssr: false },
);

/**
 * The cart drawer (Base UI Sheet) is mounted on every page but only ever
 * visible after an add-to-cart click — without this, its code loaded on
 * 100% of pageviews for 0% of first paints.
 *
 * The `setHasOpened(true)` call below runs during render, not in an effect:
 * this is React's documented "adjusting state based on a prop/store change"
 * pattern (see react.dev, "You Might Not Need an Effect"). It's guarded so
 * it only ever fires once — after that render, `hasOpened` is already true
 * and the condition is false — so it doesn't cascade the way a `setState`
 * inside `useEffect` would.
 */
export function CartDrawerLoader() {
  const isOpen = useCartStore((state) => state.isDrawerOpen);
  const [hasOpened, setHasOpened] = useState(false);

  if (isOpen && !hasOpened) {
    setHasOpened(true);
  }

  if (!hasOpened) {
    return null;
  }

  return <CartDrawer />;
}
