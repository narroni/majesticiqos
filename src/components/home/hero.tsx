import { getTranslations } from "next-intl/server";

import { HeroContent } from "@/components/home/hero-content";
import { getPathname } from "@/i18n/navigation";
import { getStoreSettings } from "@/lib/data/settings";
import type { Locale } from "@/types";

export async function Hero({ locale }: { locale: Locale }) {
  const [t, settings] = await Promise.all([getTranslations("home.hero"), getStoreSettings()]);

  // Every field falls back to the message-file default when the admin
  // hasn't set one, so an unconfigured hero never renders blank
  // (src/lib/data/settings.ts, /admin/settings "Homepage hero"). HeroContent
  // itself has no i18n awareness — hrefs are resolved to real, locale-
  // prefixed paths here, via next-intl's getPathname, so that same
  // component stays reusable in the admin live preview without needing a
  // NextIntlClientProvider there.
  const tagline = locale === "sq" ? settings.heroTaglineSq : settings.heroTaglineEn;
  const heading = (locale === "sq" ? settings.heroHeadingSq : settings.heroHeadingEn) || t("title");
  const subheading =
    (locale === "sq" ? settings.heroSubheadingSq : settings.heroSubheadingEn) || t("subtitle");
  const ctaText = (locale === "sq" ? settings.heroCtaTextSq : settings.heroCtaTextEn) || t("ctaPrimary");
  const ctaHrefRaw = (locale === "sq" ? settings.heroCtaHrefSq : settings.heroCtaHrefEn) || "/products";

  return (
    <HeroContent
      tagline={tagline ?? ""}
      heading={heading}
      subheading={subheading}
      ctaText={ctaText}
      ctaHref={getPathname({ href: ctaHrefRaw, locale })}
      secondaryCtaText={t("ctaSecondary")}
      secondaryCtaHref={getPathname({ href: "/about", locale })}
      images={settings.heroImages}
    />
  );
}
