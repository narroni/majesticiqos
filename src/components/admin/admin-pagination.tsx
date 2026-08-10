import Link from "next/link";

import { cn } from "@/lib/cn";

export const ADMIN_PAGE_SIZES = [10, 20, 50] as const;
export type AdminPageSize = (typeof ADMIN_PAGE_SIZES)[number];
export const DEFAULT_ADMIN_PAGE_SIZE: AdminPageSize = 20;

function isAdminPageSize(value: number): value is AdminPageSize {
  return (ADMIN_PAGE_SIZES as readonly number[]).includes(value);
}

/**
 * Shared `page`/`perPage` parsing for every admin list (products, orders) —
 * both live in the URL so a refresh or a back-press lands on the same page
 * and size the admin was looking at. An out-of-range perPage (tampered URL,
 * old bookmark) falls back to the default rather than erroring.
 */
export function parseAdminPaginationParams(params: {
  page?: string;
  perPage?: string;
}): { page: number; perPage: AdminPageSize } {
  const page = Math.max(1, Number(params.page) || 1);
  const perPageRaw = Number(params.perPage);
  const perPage = isAdminPageSize(perPageRaw) ? perPageRaw : DEFAULT_ADMIN_PAGE_SIZE;
  return { page, perPage };
}

function buildHref(
  basePath: string,
  baseQuery: string,
  patch: Record<string, string | number | undefined>,
): string {
  const next = new URLSearchParams(baseQuery);
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
  }
  const query = next.toString();
  return query ? `${basePath}?${query}` : basePath;
}

interface AdminPaginationProps {
  page: number;
  // Not AdminPageSize here: this just displays whatever the data layer
  // actually used (echoed back from filters.perPage), which is typed as a
  // plain number there — parseAdminPaginationParams is what constrains
  // untrusted URL input to the allowed set before it ever reaches that layer.
  perPage: number;
  total: number;
  basePath: string;
  /** Current query string with `page` and `perPage` already stripped out. */
  queryWithoutPagination: string;
}

// Plain <Link>s throughout, not a client-side Select/dropdown — every state
// this reflects (page, page size) already lives in the URL, so this needs
// no client JS at all to work, on desktop or mobile.
export function AdminPagination({
  page,
  perPage,
  total,
  basePath,
  queryWithoutPagination,
}: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;
  const rangeStart = total === 0 ? 0 : (page - 1) * perPage + 1;
  const rangeEnd = Math.min(page * perPage, total);

  function href(patch: { page?: number; perPage?: number }): string {
    return buildHref(basePath, queryWithoutPagination, {
      page: !patch.page || patch.page <= 1 ? undefined : patch.page,
      perPage:
        (patch.perPage ?? perPage) === DEFAULT_ADMIN_PAGE_SIZE ? undefined : (patch.perPage ?? perPage),
    });
  }

  return (
    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-fg-muted font-mono text-xs whitespace-nowrap">
          Showing {rangeStart}–{rangeEnd} of {total}
        </span>
        <div className="border-border-strong inline-flex shrink-0 rounded-full border p-0.5">
          {ADMIN_PAGE_SIZES.map((size) => (
            <Link
              key={size}
              href={href({ perPage: size })}
              aria-current={perPage === size ? "true" : undefined}
              className={cn(
                "rounded-full px-2.5 py-1 font-mono text-xs transition-colors",
                perPage === size
                  ? "bg-accent text-bg-base"
                  : "text-fg-secondary hover:text-fg-primary",
              )}
            >
              {size}
            </Link>
          ))}
        </div>
      </div>

      {totalPages > 1 ? (
        <nav className="flex items-center gap-4">
          <Link
            href={href({ page: page - 1 })}
            aria-disabled={isFirstPage}
            className={cn(
              "text-fg-secondary hover:text-fg-primary font-mono text-xs",
              isFirstPage && "pointer-events-none opacity-40",
            )}
          >
            Previous
          </Link>
          <span className="text-fg-muted font-mono text-xs whitespace-nowrap">
            Page {page} of {totalPages}
          </span>
          <Link
            href={href({ page: page + 1 })}
            aria-disabled={isLastPage}
            className={cn(
              "text-fg-secondary hover:text-fg-primary font-mono text-xs",
              isLastPage && "pointer-events-none opacity-40",
            )}
          >
            Next
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
