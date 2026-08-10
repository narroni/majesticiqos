import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/seo";

// BLUEPRINT §9.2 — allow everything except /admin, /api, /order/* (contains
// PII, must never be indexed) and /design-system. Order confirmation pages
// are locale-prefixed (/sq/order/*, /en/order/*), hence the leading
// wildcard rather than a bare "/order/*".
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/design-system", "/*/order/*"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
