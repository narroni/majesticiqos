import { getTranslations } from "next-intl/server";

import { FilterFields } from "@/components/catalog/filter-fields";
import type { CategoryWithCount } from "@/types";

export async function FilterSidebar({
  categories,
}: {
  categories: CategoryWithCount[];
}) {
  const t = await getTranslations("catalog");

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <h2 className="text-h3 font-display text-fg-primary mb-6">
        {t("filters")}
      </h2>
      <FilterFields categories={categories} />
    </aside>
  );
}
