"use server";

import "server-only";

import { z } from "zod";

import { getProductsByIds } from "@/lib/data/products";
import type { Locale, ProductCardData } from "@/types";

// Not a write — CLAUDE.md's Server Actions rule is about where writes must
// live, not a ban on other Server Actions. The cart is client-only with no
// server cart, so this is the RPC boundary a Client Component needs to ask
// the server for live product truth; the actual query still goes through
// the DAL (getProductsByIds), per the reads rule.
const reconcileCartSchema = z.object({
  productIds: z.array(z.string().uuid()).max(200),
  locale: z.enum(["sq", "en"]),
});

export interface ReconcileCartInput {
  productIds: string[];
  locale: Locale;
}

export async function reconcileCart({
  productIds,
  locale,
}: ReconcileCartInput): Promise<Record<string, ProductCardData>> {
  const parsed = reconcileCartSchema.safeParse({ productIds, locale });

  // Invalid input (malformed client-side cart state) is treated the same as
  // "nothing to reconcile" — an empty map — same as every product in it
  // being missing from the DB: the caller's reconcileCartItem already
  // treats a missing product as "no longer available," a safe fallback
  // either way.
  if (!parsed.success || parsed.data.productIds.length === 0) {
    return {};
  }

  const products = await getProductsByIds(parsed.data.productIds, parsed.data.locale);

  return Object.fromEntries(products.map((product) => [product.id, product]));
}
