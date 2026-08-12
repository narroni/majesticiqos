"use server";

import "server-only";

import { z } from "zod";

import { searchProductsLite, type ProductSearchHit } from "@/lib/data/products";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/types";

const searchQuerySchema = z.object({
  query: z.string().trim().min(1).max(100),
  locale: z.enum(routing.locales),
});

// Backs the header's live search overlay. Read-only and public — no admin
// check needed — but still zod-validated like every other action, since
// this is a client-invoked entry point and the query string is
// user-controlled input.
export async function searchProductsAction(
  query: string,
  locale: Locale,
): Promise<ProductSearchHit[]> {
  const parsed = searchQuerySchema.safeParse({ query, locale });
  if (!parsed.success) {
    return [];
  }

  return searchProductsLite(parsed.data.query, parsed.data.locale);
}
