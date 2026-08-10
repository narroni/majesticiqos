import type { MetadataRoute } from "next";

import { getSitemapCategories } from "@/lib/data/categories";
import { getSitemapProducts } from "@/lib/data/products";
import { getSiteUrl } from "@/lib/seo";
import { routing } from "@/i18n/routing";

// BLUEPRINT §9.2 — both locale variants of home, products listing, every
// product, every category, and the categories index. Deliberately excludes
// /admin, /api, /order/*, /design-system, /checkout, /cart (personalized,
// PII-bearing, or internal — see app/robots.ts for the crawl-level version
// of the same exclusions) and the bare-stub static pages (About, Contact,
// Terms, Privacy, Shipping & Returns — no real content behind them yet).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const locales = routing.locales;

  const [products, categories] = await Promise.all([
    getSitemapProducts(),
    getSitemapCategories(),
  ]);

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    entries.push({
      url: `${base}/${locale}`,
      changeFrequency: "daily",
      priority: 1,
    });
    entries.push({
      url: `${base}/${locale}/products`,
      changeFrequency: "hourly",
      priority: 0.8,
    });
    entries.push({
      url: `${base}/${locale}/categories`,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  for (const product of products) {
    for (const locale of locales) {
      entries.push({
        url: `${base}/${locale}/products/${product.slug}`,
        lastModified: product.updatedAt,
        changeFrequency: "daily",
        priority: 0.7,
      });
    }
  }

  for (const category of categories) {
    for (const locale of locales) {
      entries.push({
        url: `${base}/${locale}/categories/${category.slug}`,
        lastModified: category.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
