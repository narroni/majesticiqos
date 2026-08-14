import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { Stagger } from "@/components/motion/stagger";
import { ProductCard } from "@/components/product/product-card";
import { Container } from "@/components/shared/container";
import { JsonLd } from "@/components/shared/json-ld";
import { siteConfig } from "@/config/site";
import { getCategoryBySlug, getSitemapCategories } from "@/lib/data/categories";
import { getProducts } from "@/lib/data/products";
import { requireLocale } from "@/lib/locale";
import { buildAlternates, buildBreadcrumbJsonLd, buildItemListJsonLd, getSiteUrl } from "@/lib/seo";

// BLUEPRINT §1.2 — same treatment as product detail: ISR, revalidate 300,
// tag `category:{slug}` (see getCategoryBySlug and CLAUDE.md's caching rules).
export const revalidate = 300;

const PER_PAGE = 24;

interface CategoryPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const categories = await getSitemapCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = requireLocale(rawLocale);
  const category = await getCategoryBySlug(slug, locale);

  if (!category) {
    return {};
  }

  const tSeo = await getTranslations({ locale, namespace: "seo.category" });
  const description =
    category.description ||
    tSeo("descriptionFallback", { categoryName: category.name, siteName: siteConfig.name });

  return {
    title: category.name,
    description,
    alternates: buildAlternates(`/categories/${slug}`, locale),
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { locale, slug } = await params;
  const currentLocale = requireLocale(locale);

  const category = await getCategoryBySlug(slug, currentLocale);

  if (!category) {
    notFound();
  }

  const [tNav, tCatalog, result] = await Promise.all([
    getTranslations("nav"),
    getTranslations("catalog"),
    getProducts({ locale: currentLocale, categorySlug: slug, perPage: PER_PAGE }),
  ]);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: siteConfig.name, url: `${getSiteUrl()}/${currentLocale}` },
    { name: tNav("categories"), url: `${getSiteUrl()}/${currentLocale}/categories` },
    { name: category.name, url: `${getSiteUrl()}/${currentLocale}/categories/${slug}` },
  ]);

  const itemListJsonLd = buildItemListJsonLd(
    result.items.map((product) => ({
      name: product.name,
      url: `${getSiteUrl()}/${currentLocale}/products/${product.slug}`,
    })),
  );

  return (
    <Container className="flex flex-col gap-8 py-12 lg:py-16">
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={itemListJsonLd} />

      <div className="flex flex-col gap-3">
        <h1 className="text-h1 font-display text-fg-primary">{category.name}</h1>
        {/* Real per-category copy only (BLUEPRINT §9.5) — no fallback text
            invented when a category has no description set yet. */}
        {category.description ? (
          <p className="text-fg-secondary font-body text-body-lg max-w-2xl">
            {category.description}
          </p>
        ) : null}
      </div>

      {result.items.length === 0 ? (
        <p className="text-fg-secondary font-body text-sm">{tCatalog("noResults")}</p>
      ) : (
        <Stagger
          className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4"
          immediateCount={4}
        >
          {result.items.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              locale={currentLocale}
              priority={index < 4}
            />
          ))}
        </Stagger>
      )}
    </Container>
  );
}
