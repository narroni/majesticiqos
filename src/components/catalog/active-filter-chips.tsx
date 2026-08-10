"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { usePathname, useRouter } from "@/i18n/navigation";
import { buildFilterQueryString } from "@/lib/url-params";
import { formatPrice } from "@/lib/utils";
import type { CategoryWithCount, Locale } from "@/types";

interface ActiveFilterChipsProps {
  categories: CategoryWithCount[];
  locale: Locale;
}

export function ActiveFilterChips({
  categories,
  locale,
}: ActiveFilterChipsProps) {
  const t = useTranslations("catalog");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function remove(key: string) {
    const query = buildFilterQueryString(searchParams, { [key]: undefined });
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  const chips: { key: string; label: string }[] = [];

  const search = searchParams.get("search");
  if (search) {
    chips.push({ key: "search", label: `"${search}"` });
  }

  const categorySlug = searchParams.get("category");
  if (categorySlug) {
    const category = categories.find((c) => c.slug === categorySlug);
    if (category) {
      chips.push({ key: "category", label: category.name });
    }
  }

  const minPrice = searchParams.get("minPrice");
  if (minPrice) {
    chips.push({
      key: "minPrice",
      label: `≥ ${formatPrice(Number(minPrice) * 100, locale)}`,
    });
  }

  const maxPrice = searchParams.get("maxPrice");
  if (maxPrice) {
    chips.push({
      key: "maxPrice",
      label: `≤ ${formatPrice(Number(maxPrice) * 100, locale)}`,
    });
  }

  if (searchParams.get("inStockOnly") === "true") {
    chips.push({ key: "inStockOnly", label: t("inStockOnly") });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => remove(chip.key)}
          className="bg-bg-subtle text-fg-secondary hover:text-fg-primary flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-mono text-xs"
        >
          {chip.label}
          <X className="size-3" aria-hidden="true" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => router.replace(pathname)}
        className="text-fg-muted hover:text-fg-primary text-xs underline"
      >
        {t("clearFilters")}
      </button>
    </div>
  );
}
