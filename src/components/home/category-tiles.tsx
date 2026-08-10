import { getTranslations } from "next-intl/server";
import Image from "next/image";

import { Stagger } from "@/components/motion/stagger";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { SectionHeading } from "@/components/shared/section-heading";
import { Link } from "@/i18n/navigation";
import { getCategories } from "@/lib/data/categories";
import { cx } from "@/lib/utils";
import type { Locale } from "@/types";

const TILE_COUNT = 3;

export async function CategoryTiles({ locale }: { locale: Locale }) {
  const t = await getTranslations("home.categories");
  const tCatalog = await getTranslations("catalog");
  const categories = (await getCategories(locale)).slice(0, TILE_COUNT);

  if (categories.length === 0) {
    return null;
  }

  return (
    <Section background="elevated">
      <Container className="flex flex-col gap-10">
        <SectionHeading eyebrow={t("eyebrow")} title={t("heading")} />

        <Stagger className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {categories.map((category, index) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className={cx(
                "group bg-bg-subtle relative flex aspect-4/5 items-end overflow-hidden rounded-md",
                index === 0 && "lg:row-span-2 lg:aspect-auto",
              )}
            >
              {category.imageUrl ? (
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  fill
                  className="object-cover transition-transform duration-400 group-hover:scale-105"
                />
              ) : null}

              <div className="from-bg-base/80 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />

              <div className="relative flex flex-col gap-1 p-6">
                <span className="text-fg-primary font-display text-h3">
                  {category.name}
                </span>
                <span className="text-fg-secondary font-body text-sm">
                  {tCatalog("resultsCount", { count: category.productCount })}
                </span>
              </div>
            </Link>
          ))}
        </Stagger>
      </Container>
    </Section>
  );
}
