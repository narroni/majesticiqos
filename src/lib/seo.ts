// Isomorphic (no "server-only") — used by generateMetadata, page components,
// app/sitemap.ts and app/robots.ts alike.
import { siteConfig } from "@/config/site";
import type { Locale } from "@/types";

/**
 * Falls back to localhost so dev/build never crashes on a missing env var,
 * but every canonical/hreflang/sitemap/robots URL is only correct once
 * NEXT_PUBLIC_SITE_URL is actually set (BLUEPRINT §1.5) — it's blank in
 * this project's .env.local right now.
 */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

/**
 * BLUEPRINT §9.2 — canonical points at the current locale's own URL;
 * hreflang lists both locales plus x-default pointing at sq (the site's
 * default locale, see src/i18n/routing.ts).
 */
export function buildAlternates(pathWithoutLocale: string, currentLocale: Locale) {
  const base = getSiteUrl();
  const sqUrl = `${base}/sq${pathWithoutLocale}`;
  const enUrl = `${base}/en${pathWithoutLocale}`;

  return {
    canonical: currentLocale === "sq" ? sqUrl : enUrl,
    languages: {
      sq: sqUrl,
      en: enUrl,
      "x-default": sqUrl,
    },
  };
}

export function buildOrganizationJsonLd() {
  const base = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: base,
  };
}

/**
 * SearchAction targets the products listing's real `?search=` query param
 * (src/lib/url-params.ts) — a working search, not a placeholder URL.
 */
export function buildWebsiteJsonLd(locale: Locale) {
  const base = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: `${base}/${locale}`,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${base}/${locale}/products?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface ItemListEntry {
  name: string;
  url: string;
}

export function buildItemListJsonLd(items: ItemListEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
}
