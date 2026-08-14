import { getTranslations } from "next-intl/server";

import { Stagger } from "@/components/motion/stagger";
import { ProductCard } from "@/components/product/product-card";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { SectionHeading } from "@/components/shared/section-heading";
import { Link } from "@/i18n/navigation";
import { getFeaturedProducts } from "@/lib/data/products";
import type { Locale } from "@/types";

const FEATURED_LIMIT = 4;

export async function FeaturedProducts({ locale }: { locale: Locale }) {
  const t = await getTranslations("home.featured");
  const tCommon = await getTranslations("common");
  const products = await getFeaturedProducts(locale, FEATURED_LIMIT);

  if (products.length === 0) {
    return null;
  }

  return (
    <Section>
      <Container className="flex flex-col gap-10">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("heading")}
          action={
            <Link
              href="/products"
              className="text-fg-secondary hover:text-fg-primary text-sm"
            >
              {tCommon("viewAll")}
            </Link>
          }
        />

        <Stagger
          className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4"
          immediateCount={FEATURED_LIMIT}
        >
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              locale={locale}
              priority={index === 0}
            />
          ))}
        </Stagger>
      </Container>
    </Section>
  );
}
