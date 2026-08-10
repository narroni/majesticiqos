import type { SortOption } from "@/types";

const SORT_OPTIONS: readonly SortOption[] = [
  "newest",
  "price_asc",
  "price_desc",
  "best_selling",
];

function isSortOption(value: unknown): value is SortOption {
  return (
    typeof value === "string" &&
    (SORT_OPTIONS as readonly string[]).includes(value)
  );
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  /** Euros, not cents — the URL is human-facing. */
  minPrice?: number;
  /** Euros, not cents — the URL is human-facing. */
  maxPrice?: number;
  inStockOnly?: boolean;
  sort: SortOption;
  page: number;
}

export function parseProductFilters(
  searchParams: Record<string, string | string[] | undefined>,
): ProductFilters {
  const search = firstValue(searchParams.search)?.trim() || undefined;
  const category = firstValue(searchParams.category)?.trim() || undefined;

  const minPriceRaw = Number(firstValue(searchParams.minPrice));
  const maxPriceRaw = Number(firstValue(searchParams.maxPrice));

  const sortRaw = firstValue(searchParams.sort);
  const pageRaw = Number(firstValue(searchParams.page));

  return {
    search,
    category,
    minPrice:
      Number.isFinite(minPriceRaw) && minPriceRaw > 0 ? minPriceRaw : undefined,
    maxPrice:
      Number.isFinite(maxPriceRaw) && maxPriceRaw > 0 ? maxPriceRaw : undefined,
    inStockOnly: firstValue(searchParams.inStockOnly) === "true" || undefined,
    sort: isSortOption(sortRaw) ? sortRaw : "newest",
    page: Number.isFinite(pageRaw) && pageRaw > 1 ? Math.floor(pageRaw) : 1,
  };
}

/**
 * Builds a query string from the current URLSearchParams plus a patch,
 * dropping empty/false/undefined values so the URL stays clean. Any change
 * other than an explicit page change resets pagination to page 1 — changing
 * a filter while on page 3 of the old results would otherwise strand the
 * user past the end of the new, filtered list.
 */
export function buildFilterQueryString(
  current: URLSearchParams,
  patch: Record<string, string | number | boolean | undefined>,
): string {
  const next = new URLSearchParams(current);
  const isPageOnlyChange = Object.keys(patch).length === 1 && "page" in patch;

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === "" || value === false) {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
  }

  if (!isPageOnlyChange) {
    next.delete("page");
  }

  return next.toString();
}
