import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Reveal } from "@/components/motion/reveal";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductPurchase } from "@/components/product/product-purchase";
import { RelatedProducts } from "@/components/product/related-products";
import { Container } from "@/components/shared/container";
import { JsonLd } from "@/components/shared/json-ld";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import {
  getAllProductSlugs,
  getProductBySlug,
} from "@/lib/data/products";
import { requireLocale } from "@/lib/locale";
import { buildAlternates, buildBreadcrumbJsonLd, getSiteUrl } from "@/lib/seo";
import { formatPrice } from "@/lib/utils";

// BLUEPRINT §1.2 — Product detail: RSC + ISR + generateStaticParams,
// revalidate 300, tag `product:{slug}` (see CLAUDE.md's caching rules).
export const revalidate = 300;

interface ProductPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = requireLocale(rawLocale);
  const product = await getProductBySlug(slug, locale);

  if (!product) {
    return {};
  }

  const title = product.metaTitle || product.name;
  const description = product.metaDescription || product.shortDescription || undefined;

  return {
    title,
    description,
    alternates: buildAlternates(`/products/${slug}`, locale),
    // No manual openGraph.images here — the dynamic opengraph-image.tsx in
    // this route segment supplies the branded product/name/price image
    // automatically; overriding it with the raw product photo would defeat
    // the point of having one (BLUEPRINT §9.5).
    openGraph: { title, description },
  };
}

function toAvailability(stockStatus: string) {
  return stockStatus === "out_of_stock"
    ? "https://schema.org/OutOfStock"
    : "https://schema.org/InStock";
}

// Google mainly checks this isn't in the past; without a scheduled sale to
// point to, "valid through the end of this year" is an honest, defensible
// claim rather than an arbitrary invented date.
function getPriceValidUntil(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), 11, 31)).toISOString().slice(0, 10);
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { locale, slug } = await params;
  const currentLocale = requireLocale(locale);

  const product = await getProductBySlug(slug, currentLocale);

  if (!product) {
    notFound();
  }

  const [t, tNav] = await Promise.all([
    getTranslations("product"),
    getTranslations("nav"),
  ]);
  const isDiscounted = product.discountPriceCents != null;
  const isOutOfStock = product.stockStatus === "out_of_stock";
  const isLowStock = product.stockStatus === "low_stock";

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription ?? undefined,
    sku: product.sku ?? undefined,
    brand: { "@type": "Brand", name: siteConfig.name },
    image: product.images.map((image) => image.storagePath),
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: (product.effectivePriceCents / 100).toFixed(2),
      availability: toAvailability(product.stockStatus),
      priceValidUntil: getPriceValidUntil(),
    },
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: siteConfig.name, url: `${getSiteUrl()}/${currentLocale}` },
    { name: tNav("products"), url: `${getSiteUrl()}/${currentLocale}/products` },
    ...(product.category
      ? [
          {
            name: product.categoryName ?? product.category.slug,
            url: `${getSiteUrl()}/${currentLocale}/categories/${product.category.slug}`,
          },
        ]
      : []),
    { name: product.name, url: `${getSiteUrl()}/${currentLocale}/products/${product.slug}` },
  ]);

  return (
    <Container className="flex flex-col gap-16 py-12 pb-28 lg:pb-16">
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <ProductGallery images={product.images} productName={product.name} />
        </Reveal>

        <Reveal delay={100} className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            {product.categoryName ? (
              <Link
                href={
                  product.category
                    ? `/products?category=${product.category.slug}`
                    : "/products"
                }
                className="text-accent font-mono text-xs tracking-[0.15em] uppercase"
              >
                {product.categoryName}
              </Link>
            ) : null}

            <h1 className="text-h1 font-display text-fg-primary">
              {product.name}
            </h1>

            <div className="flex items-center gap-3">
              <span className="text-accent font-mono text-lg">
                {formatPrice(product.effectivePriceCents, currentLocale)}
              </span>
              {isDiscounted && (
                <span className="text-fg-muted font-mono text-base line-through">
                  {formatPrice(product.priceCents, currentLocale)}
                </span>
              )}
            </div>

            <p
              className={
                isOutOfStock
                  ? "text-danger font-body text-sm"
                  : isLowStock
                    ? "text-warning font-body text-sm"
                    : "text-success font-body text-sm"
              }
            >
              {isOutOfStock
                ? t("outOfStock")
                : isLowStock
                  ? t("lowStock", { count: product.stockQuantity })
                  : t("inStock")}
            </p>
          </div>

          <ProductPurchase product={product} locale={currentLocale} />

          {product.description ? (
            <div className="border-border flex flex-col gap-3 border-t pt-6">
              <h2 className="text-fg-primary font-display text-lg">
                {t("description")}
              </h2>
              <p className="text-fg-secondary font-body text-body whitespace-pre-line">
                {product.description}
              </p>
            </div>
          ) : null}
        </Reveal>
      </div>

      <Suspense fallback={null}>
        <RelatedProducts
          productId={product.id}
          categoryId={product.categoryId}
          locale={currentLocale}
        />
      </Suspense>
    </Container>
  );
}
