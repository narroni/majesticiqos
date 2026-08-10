import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Current query string with `page` already stripped out. */
  queryWithoutPage: string;
}

function hrefForPage(page: number, queryWithoutPage: string): string {
  const params = new URLSearchParams(queryWithoutPage);
  if (page > 1) {
    params.set("page", String(page));
  }
  const query = params.toString();
  return query ? `/products?${query}` : "/products";
}

export async function Pagination({
  page,
  totalPages,
  queryWithoutPage,
}: PaginationProps) {
  const t = await getTranslations("catalog.pagination");

  if (totalPages <= 1) {
    return null;
  }

  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  return (
    <nav className="flex items-center justify-between gap-4 pt-4">
      <Link
        href={hrefForPage(page - 1, queryWithoutPage)}
        aria-disabled={isFirstPage}
        className={cn(
          "text-fg-secondary hover:text-fg-primary text-sm",
          isFirstPage && "pointer-events-none opacity-40",
        )}
      >
        {t("previous")}
      </Link>
      <span className="text-fg-muted font-mono text-xs">
        {t("pageInfo", { page, totalPages })}
      </span>
      <Link
        href={hrefForPage(page + 1, queryWithoutPage)}
        aria-disabled={isLastPage}
        className={cn(
          "text-fg-secondary hover:text-fg-primary text-sm",
          isLastPage && "pointer-events-none opacity-40",
        )}
      >
        {t("next")}
      </Link>
    </nav>
  );
}
