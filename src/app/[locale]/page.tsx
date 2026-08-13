import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AnnouncementBar } from "@/components/home/announcement-bar";
import { BestSellers } from "@/components/home/best-sellers";
import { CategoryTiles } from "@/components/home/category-tiles";
import { FeaturedProducts } from "@/components/home/featured-products";
import { Hero } from "@/components/home/hero";
import { SocialWall } from "@/components/home/social-wall";
import { WhyChooseUs } from "@/components/home/why-choose-us";
import { siteConfig } from "@/config/site";
import { getStoreSettings } from "@/lib/data/settings";
import { requireLocale } from "@/lib/locale";
import { buildAlternates } from "@/lib/seo";

// BLUEPRINT §1.2 — Home: RSC + ISR, revalidate 300, tag `home`.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "seo" });

  return {
    // The homepage's own title IS the brand name — no "%s | Brand" template.
    title: { absolute: siteConfig.name },
    description: t("defaultDescription"),
    alternates: buildAlternates("", locale),
  };
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const currentLocale = requireLocale((await params).locale);

  const settings = await getStoreSettings();
  const announcementText =
    currentLocale === "sq" ? settings.announcementTextSq : settings.announcementTextEn;

  return (
    <>
      {settings.announcementEnabled && announcementText ? (
        <AnnouncementBar text={announcementText} />
      ) : null}
      <Hero locale={currentLocale} />
      <FeaturedProducts locale={currentLocale} />
      <CategoryTiles locale={currentLocale} />
      <BestSellers locale={currentLocale} />
      <WhyChooseUs />
      <SocialWall locale={currentLocale} />
    </>
  );
}
