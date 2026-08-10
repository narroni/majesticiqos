import { getTranslations } from "next-intl/server";

import { Stagger } from "@/components/motion/stagger";
import { ProductCard } from "@/components/product/product-card";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { SectionHeading } from "@/components/shared/section-heading";
import { getBestSellers } from "@/lib/data/products";
import type { Locale } from "@/types";

const BEST_SELLERS_LIMIT = 4;

export async function BestSellers({ locale }: { locale: Locale }) {
  const t = await getTranslations("home.bestSellers");
  const products = await getBestSellers(locale, BEST_SELLERS_LIMIT);

  if (products.length === 0) {
    return null;
  }

  return (
    <Section background="elevated">
      <Container className="flex flex-col gap-10">
        <SectionHeading eyebrow={t("eyebrow")} title={t("heading")} />

        <Stagger className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              locale={locale}
              rank={index + 1}
            />
          ))}
        </Stagger>
      </Container>
    </Section>
  );
}
