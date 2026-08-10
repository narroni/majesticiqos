import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ComingSoonPage } from "@/components/shared/coming-soon-page";
import type { Locale } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "footer" });

  return {
    title: t("links.about"),
    robots: { index: false, follow: false },
  };
}

export default async function AboutPage() {
  const t = await getTranslations("footer");
  return <ComingSoonPage title={t("links.about")} />;
}
