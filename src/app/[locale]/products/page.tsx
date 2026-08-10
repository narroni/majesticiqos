import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { ActiveFilterChips } from "@/components/catalog/active-filter-chips";
import { EmptyState } from "@/components/catalog/empty-state";
import { FilterSheet } from "@/components/catalog/filter-sheet";
import { FilterSidebar } from "@/components/catalog/filter-sidebar";
import { Pagination } from "@/components/catalog/pagination";
import { ProductGridSkeleton } from "@/components/catalog/product-grid-skeleton";
import { SearchInput } from "@/components/catalog/search-input";
import { SortSelect } from "@/components/catalog/sort-select";
import { Stagger } from "@/components/motion/stagger";
import { ProductCard } from "@/components/product/product-card";
import { Container } from "@/components/shared/container";
import { JsonLd } from "@/components/shared/json-ld";
import { getCategories } from "@/lib/data/categories";
import { getProducts } from "@/lib/data/products";
import { buildAlternates, buildItemListJsonLd, getSiteUrl } from "@/lib/seo";
import { parseProductFilters, type ProductFilters } from "@/lib/url-params";
import type { Locale } from "@/types";

const PER_PAGE = 24;

// BLUEPRINT §1.2 — Products list: "RSC, dynamic on searchParams". Reading
// searchParams below forces this route dynamic regardless of the export
// below; what's actually cached at revalidate 60 / tag `products` is the
// underlying data fetch in src/lib/data/products.ts.
export const revalidate = 60;

interface ProductsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [tNav, tSeo] = await Promise.all([
    getTranslations({ locale: locale as Locale, namespace: "nav" }),
    getTranslations({ locale: locale as Locale, namespace: "seo" }),
  ]);

  return {
    title: tNav("products"),
    description: tSeo("defaultDescription"),
    // Canonical always points at the unfiltered listing regardless of any
    // active search/category/price params — those are the same content,
    // not distinct pages, and shouldn't compete against each other or the
    // canonical URL for ranking.
    alternates: buildAlternates("/products", locale as Locale),
  };
}

export default async function ProductsPage({
  params,
  searchParams,
}: ProductsPageProps) {
  const { locale } = await params;
  const currentLocale = locale as Locale;
  const rawSearchParams = await searchParams;
  const filters = parseProductFilters(rawSearchParams);

  const [tNav, categories] = await Promise.all([
    getTranslations("nav"),
    getCategories(currentLocale, "listing"),
  ]);

  return (
    <Container className="flex flex-col gap-8 py-12 lg:py-16">
      <h1 className="text-h1 font-display text-fg-primary">
        {tNav("products")}
      </h1>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput />
          <div className="flex items-center gap-3">
            <FilterSheet categories={categories} />
            <SortSelect />
          </div>
        </div>
        <ActiveFilterChips categories={categories} locale={currentLocale} />
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        <FilterSidebar categories={categories} />

        <div className="flex flex-1 flex-col gap-8">
          <Suspense
            key={JSON.stringify(filters)}
            fallback={<ProductGridSkeleton />}
          >
            <ProductResults
              locale={currentLocale}
              filters={filters}
              rawSearchParams={rawSearchParams}
            />
          </Suspense>
        </div>
      </div>
    </Container>
  );
}

async function ProductResults({
  locale,
  filters,
  rawSearchParams,
}: {
  locale: Locale;
  filters: ProductFilters;
  rawSearchParams: Record<string, string | string[] | undefined>;
}) {
  const t = await getTranslations("catalog");

  const result = await getProducts({
    locale,
    categorySlug: filters.category,
    search: filters.search,
    minPrice:
      filters.minPrice != null ? Math.round(filters.minPrice * 100) : undefined,
    maxPrice:
      filters.maxPrice != null ? Math.round(filters.maxPrice * 100) : undefined,
    inStockOnly: filters.inStockOnly,
    sort: filters.sort,
    page: filters.page,
    perPage: PER_PAGE,
  });

  if (result.items.length === 0) {
    return <EmptyState />;
  }

  const totalPages = Math.max(1, Math.ceil(result.total / PER_PAGE));
  const queryWithoutPage = new URLSearchParams(
    Object.entries(rawSearchParams)
      .filter(([key, value]) => key !== "page" && value != null)
      .map(([key, value]) => [
        key,
        Array.isArray(value) ? (value[0] ?? "") : value,
      ]) as [string, string][],
  ).toString();

  const itemListJsonLd = buildItemListJsonLd(
    result.items.map((product) => ({
      name: product.name,
      url: `${getSiteUrl()}/${locale}/products/${product.slug}`,
    })),
  );

  return (
    <>
      <JsonLd data={itemListJsonLd} />

      <p className="text-fg-muted font-body text-sm">
        {t("resultsCount", { count: result.total })}
      </p>

      <Stagger className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
        {result.items.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            locale={locale}
            priority={index < 4}
          />
        ))}
      </Stagger>

      <Pagination
        page={filters.page}
        totalPages={totalPages}
        queryWithoutPage={queryWithoutPage}
      />
    </>
  );
}
