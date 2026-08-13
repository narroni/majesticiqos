import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CartPageContent } from "@/components/cart/cart-page-content";
import { Container } from "@/components/shared/container";
import { getShippingRates } from "@/lib/data/shipping";
import { requireLocale } from "@/lib/locale";

interface CartPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: CartPageProps): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "cart" });

  // Personalized, per-session content — nothing here is worth ranking, but
  // it's not excluded from robots.txt (only /admin, /api, /order/*,
  // /design-system are), so this is the indexing signal instead of the
  // crawling one.
  return {
    title: t("title"),
    robots: { index: false, follow: true },
  };
}

export default async function CartPage({ params }: CartPageProps) {
  const currentLocale = requireLocale((await params).locale);

  const [t, shippingRates] = await Promise.all([
    getTranslations("cart"),
    getShippingRates(),
  ]);

  return (
    <Container className="flex flex-col gap-8 py-12 lg:py-16">
      <h1 className="text-h1 font-display text-fg-primary">{t("title")}</h1>
      <CartPageContent locale={currentLocale} shippingRates={shippingRates} />
    </Container>
  );
}
