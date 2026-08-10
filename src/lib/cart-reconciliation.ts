// Isomorphic on purpose (no "server-only") — the cart page's Client
// Component calls this to turn the Server Action's response into per-line
// flags. See BLUEPRINT §5.2 / §1.4: reconciliation must surface a visible
// diff, never a silent correction.
import type { CartItem } from "@/lib/stores/cart-store";
import type { ProductCardData } from "@/types";

export type ReconciliationStatus =
  | "ok"
  | "price_changed"
  | "quantity_reduced"
  | "out_of_stock"
  | "unavailable";

export interface ReconciliationResult {
  status: ReconciliationStatus;
  product: ProductCardData | null;
}

export function reconcileCartItem(
  item: CartItem,
  product: ProductCardData | undefined,
): ReconciliationResult {
  if (!product) {
    return { status: "unavailable", product: null };
  }

  if (product.stockStatus === "out_of_stock") {
    return { status: "out_of_stock", product };
  }

  if (product.stockQuantity < item.quantity) {
    return { status: "quantity_reduced", product };
  }

  if (product.effectivePriceCents !== item.priceCents) {
    return { status: "price_changed", product };
  }

  return { status: "ok", product };
}

export function isCheckoutBlocked(
  results: Record<string, ReconciliationResult>,
): boolean {
  return Object.values(results).some(
    (result) =>
      result.status === "out_of_stock" || result.status === "unavailable",
  );
}
