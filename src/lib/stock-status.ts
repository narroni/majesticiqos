// Isomorphic (no "use server"/"server-only") — same reasoning as
// order-status.ts: shared by every client component that renders a stock
// status label or filter option, and by nothing that needs a server-only
// dependency.
import type { StockStatus } from "@/types";

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};
