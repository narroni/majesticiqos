import { Plus } from "lucide-react";
import Link from "next/link";

import { AdminPagination, parseAdminPaginationParams } from "@/components/admin/admin-pagination";
import { AdminProductFilters } from "@/components/admin/products/admin-product-filters";
import { AdminProductList } from "@/components/admin/products/admin-product-list";
import { Button } from "@/components/ui/button";
import {
  getAdminCategoryOptions,
  getAdminProducts,
  getIncompleteTranslationProductIds,
} from "@/lib/data/admin-products";
import { firstValue } from "@/lib/url-params";
import type { StockStatus } from "@/types";

interface AdminProductsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  const params = await searchParams;
  const search = firstValue(params.search);
  const categoryId = firstValue(params.category);
  const stockStatus = firstValue(params.stock) as StockStatus | undefined;
  const translationFilter = firstValue(params.translation);
  const { page, perPage } = parseAdminPaginationParams({
    page: firstValue(params.page),
    perPage: firstValue(params.perPage),
  });

  const productIds =
    translationFilter === "incomplete" ? await getIncompleteTranslationProductIds() : undefined;

  const [categories, result] = await Promise.all([
    getAdminCategoryOptions(),
    getAdminProducts({ search, categoryId, stockStatus, productIds, page, perPage }),
  ]);

  const queryWithoutPagination = new URLSearchParams();
  if (search) queryWithoutPagination.set("search", search);
  if (categoryId) queryWithoutPagination.set("category", categoryId);
  if (stockStatus) queryWithoutPagination.set("stock", stockStatus);
  if (translationFilter) queryWithoutPagination.set("translation", translationFilter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-h2 font-display text-fg-primary">Products</h1>
        <Button render={<Link href="/admin/products/new" />} nativeButton={false}>
          <Plus />
          New product
        </Button>
      </div>

      <AdminProductFilters categories={categories} />

      {translationFilter === "incomplete" ? (
        <p className="text-warning font-mono text-xs">
          Showing products missing an Albanian or English translation.
        </p>
      ) : null}

      <AdminProductList products={result.items} />

      <AdminPagination
        page={result.page}
        perPage={result.perPage}
        total={result.total}
        basePath="/admin/products"
        queryWithoutPagination={queryWithoutPagination.toString()}
      />
    </div>
  );
}
