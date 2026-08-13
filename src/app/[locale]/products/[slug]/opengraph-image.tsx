import { ImageResponse } from "next/og";

import { siteConfig } from "@/config/site";
import { getProductBySlug } from "@/lib/data/products";
import { requireLocale } from "@/lib/locale";
import { formatPrice } from "@/lib/utils";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// BLUEPRINT §9.5 — this is what people actually see when a product link is
// pasted into WhatsApp, which is how most sharing happens in this market.
//
// Satori (ImageResponse's renderer) has no access to globals.css's CSS
// custom properties or Tailwind at all — this is a completely separate
// rendering pipeline, so these are the same design-token hex values,
// necessarily hardcoded here rather than referenced as `var(--accent)`.
const COLORS = {
  bgBase: "#0a0a0b",
  bgElevated: "#141416",
  fgPrimary: "#ffffff",
  accent: "#00d4ff",
};

interface OgImageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function ProductOgImage({ params }: OgImageProps) {
  const { locale: rawLocale, slug } = await params;
  const locale = requireLocale(rawLocale);
  const product = await getProductBySlug(slug, locale);

  const name = product?.name ?? siteConfig.name;
  const price = product ? formatPrice(product.effectivePriceCents, locale) : null;
  const imageUrl = product?.primaryImage?.storagePath;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: COLORS.bgBase,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            padding: "64px",
            gap: "20px",
          }}
        >
          <span
            style={{
              color: COLORS.accent,
              fontSize: 22,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            {siteConfig.name}
          </span>
          <span
            style={{
              color: COLORS.fgPrimary,
              fontSize: 54,
              fontWeight: 600,
              lineHeight: 1.15,
              maxWidth: "640px",
            }}
          >
            {name}
          </span>
          {price ? <span style={{ color: COLORS.accent, fontSize: 40 }}>{price}</span> : null}
        </div>

        {imageUrl ? (
          <div
            style={{
              display: "flex",
              width: "480px",
              height: "100%",
              background: COLORS.bgElevated,
            }}
          >
            <img
              src={imageUrl}
              alt={name}
              width={480}
              height={630}
              style={{ objectFit: "cover" }}
            />
          </div>
        ) : null}
      </div>
    ),
    { ...size },
  );
}
