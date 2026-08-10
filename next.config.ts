import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// BLUEPRINT §9.4 — client bundle budget: < 200 KB gzipped on the storefront.
// Run `ANALYZE=true npm run build` for the interactive treemap; admin has no
// budget (behind auth, used on wifi) so this only needs checking now and then.
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Derived rather than hardcoded so this follows NEXT_PUBLIC_SUPABASE_URL
// across dev/staging/prod projects automatically.
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

// BLUEPRINT §8.2. No nonce: nonce-based CSP requires every page to opt into
// dynamic rendering (Next.js can only inject a nonce during SSR, not into a
// build-time-generated static/ISR page), which would gut the SSG/ISR +
// revalidateTag caching this storefront is built around (CLAUDE.md §21,
// BLUEPRINT §9.4). script-src/style-src therefore need 'unsafe-inline':
// verified against a production build that the App Router's own RSC
// hydration payloads (`self.__next_f.push(...)`) ship as un-nonced, inline
// <script> tags, and Base UI's floating-element positioning plus Recharts
// (admin) both set inline `style` attributes at runtime — both would be
// silently dropped (broken hydration, unstyled/mispositioned popovers and
// charts) under a strict script-src/style-src without it. JSON-LD
// (type="application/ld+json") is exempt from script-src entirely — it's
// inert data, never executed by the browser regardless of CSP.
const isDev = process.env.NODE_ENV === "development";
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: https://picsum.photos${supabaseHostname ? ` https://${supabaseHostname}` : ""}`,
  "font-src 'self'",
  "connect-src 'self' https://vitals.vercel-insights.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
];

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives.join("; ") },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        // Demo-catalog placeholder images only — see supabase/seed-products.sql.
        // Remove once real product photography is uploaded to Supabase Storage.
      },
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
