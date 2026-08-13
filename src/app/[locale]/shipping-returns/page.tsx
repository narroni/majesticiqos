import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ComingSoonPage } from "@/components/shared/coming-soon-page";
import { requireLocale } from "@/lib/locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "footer" });

  return {
    title: t("links.shippingReturns"),
    robots: { index: false, follow: false },
  };
}

export default async function ShippingReturnsPage() {
  const t = await getTranslations("footer");
  return <ComingSoonPage title={t("links.shippingReturns")} />;
}
