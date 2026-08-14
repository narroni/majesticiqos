import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Stagger } from "@/components/motion/stagger";
import { Container } from "@/components/shared/container";
import { JsonLd } from "@/components/shared/json-ld";
import { Link } from "@/i18n/navigation";
import { getCategories } from "@/lib/data/categories";
import { requireLocale } from "@/lib/locale";
import { buildAlternates, buildItemListJsonLd, getSiteUrl } from "@/lib/seo";

// Same cache treatment as the home page's use of this data.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const [tHome, tSeo] = await Promise.all([
    getTranslations({ locale, namespace: "home.categories" }),
    getTranslations({ locale, namespace: "seo" }),
  ]);

  return {
    title: tHome("heading"),
    description: tSeo("defaultDescription"),
    alternates: buildAlternates("/categories", locale),
  };
}

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const currentLocale = requireLocale((await params).locale);

  const [t, tCatalog, categories] = await Promise.all([
    getTranslations("home.categories"),
    getTranslations("catalog"),
    getCategories(currentLocale, "listing"),
  ]);

  const itemListJsonLd = buildItemListJsonLd(
    categories.map((category) => ({
      name: category.name,
      url: `${getSiteUrl()}/${currentLocale}/categories/${category.slug}`,
    })),
  );

  return (
    <Container className="flex flex-col gap-10 py-12 lg:py-16">
      <JsonLd data={itemListJsonLd} />

      <h1 className="text-h1 font-display text-fg-primary">{t("heading")}</h1>

      <Stagger className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" immediateCount={3}>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className="group bg-bg-subtle relative flex aspect-4/5 items-end overflow-hidden rounded-md"
          >
            {category.imageUrl ? (
              <Image
                src={category.imageUrl}
                alt={category.name}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-400 group-hover:scale-105"
              />
            ) : null}

            <div className="from-bg-base/80 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />

            <div className="relative flex flex-col gap-1 p-6">
              <span className="text-fg-primary font-display text-h3">{category.name}</span>
              <span className="text-fg-secondary font-body text-sm">
                {tCatalog("resultsCount", { count: category.productCount })}
              </span>
            </div>
          </Link>
        ))}
      </Stagger>
    </Container>
  );
}
