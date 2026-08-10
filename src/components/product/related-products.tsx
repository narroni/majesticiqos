import { getTranslations } from "next-intl/server";

import { Stagger } from "@/components/motion/stagger";
import { ProductCard } from "@/components/product/product-card";
import { getRelatedProducts } from "@/lib/data/products";
import type { Locale } from "@/types";

interface RelatedProductsProps {
  productId: string;
  categoryId: string | null;
  locale: Locale;
}

const RELATED_LIMIT = 4;

export async function RelatedProducts({
  productId,
  categoryId,
  locale,
}: RelatedProductsProps) {
  const t = await getTranslations("product");
  const products = await getRelatedProducts(
    productId,
    categoryId,
    locale,
    RELATED_LIMIT,
  );

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-h2 font-display text-fg-primary">
        {t("relatedProducts")}
      </h2>
      <Stagger className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} locale={locale} />
        ))}
      </Stagger>
    </div>
  );
}
