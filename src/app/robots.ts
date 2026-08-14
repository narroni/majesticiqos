import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/seo";

// BLUEPRINT §9.2 — allow everything except /admin, /api, /order/* (contains
// PII, must never be indexed), /design-system, /cart, and /checkout (no
// indexable content, personalized per-session state). Locale-prefixed
// routes (/sq/order/*, /en/cart, ...) need the leading wildcard rather than
// a bare "/order/*"/"/cart"/"/checkout".
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api",
        "/design-system",
        "/*/order/*",
        "/*/cart",
        "/*/checkout",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
