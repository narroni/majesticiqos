import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CheckoutPageContent } from "@/components/checkout/checkout-page-content";
import { Container } from "@/components/shared/container";
import { getShippingRates } from "@/lib/data/shipping";
import { requireLocale } from "@/lib/locale";

interface CheckoutPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: CheckoutPageProps): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "checkout" });

  return {
    title: t("title"),
    robots: { index: false, follow: true },
  };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const currentLocale = requireLocale((await params).locale);

  const [t, shippingRates] = await Promise.all([
    getTranslations("checkout"),
    getShippingRates(),
  ]);

  return (
    <Container className="flex flex-col gap-8 py-12 lg:py-16">
      <h1 className="text-h1 font-display text-fg-primary">{t("title")}</h1>
      <CheckoutPageContent locale={currentLocale} shippingRates={shippingRates} />
    </Container>
  );
}
