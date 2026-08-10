import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

import { siteConfig } from "@/config/site";
import type { Locale } from "@/types";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Fallback for every route under this locale segment that doesn't define
// its own opengraph-image (the product detail route overrides this with a
// per-product image). Same hardcoded-hex caveat as that one — see its
// comment for why.
const COLORS = {
  bgBase: "#0a0a0b",
  fgPrimary: "#ffffff",
  fgSecondary: "#a1a1aa",
  accent: "#00d4ff",
};

export default async function LocaleOgImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "home.hero" });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px",
          background: COLORS.bgBase,
        }}
      >
        <span
          style={{
            color: COLORS.accent,
            fontSize: 28,
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          {siteConfig.name}
        </span>
        <span style={{ color: COLORS.fgPrimary, fontSize: 60, fontWeight: 600 }}>
          {t("title")}
        </span>
        <span style={{ color: COLORS.fgSecondary, fontSize: 28, maxWidth: "760px", textAlign: "center" }}>
          {t("subtitle")}
        </span>
      </div>
    ),
    { ...size },
  );
}
