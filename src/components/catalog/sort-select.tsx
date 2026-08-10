"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/navigation";
import { buildFilterQueryString } from "@/lib/url-params";
import type { SortOption } from "@/types";

// Values come from the DAL (@/types SortOption); labels come from the
// message files — this map is the only place the two are joined.
const SORT_LABEL_KEYS = {
  newest: "sort.newest",
  price_asc: "sort.priceAsc",
  price_desc: "sort.priceDesc",
  best_selling: "sort.bestSelling",
} as const satisfies Record<SortOption, string>;

const SORT_OPTIONS = Object.keys(SORT_LABEL_KEYS) as SortOption[];

export function SortSelect() {
  const t = useTranslations("catalog");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort =
    (searchParams.get("sort") as SortOption | null) ?? "newest";

  function handleChange(value: string | null) {
    const query = buildFilterQueryString(searchParams, {
      sort: value == null || value === "newest" ? undefined : value,
    });
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  // Base UI's <Select.Value> resolves the trigger's displayed label from
  // this `items` map (value -> label), not from the rendered <SelectItem>
  // children — without it, the closed trigger shows the raw value string
  // ("price_asc") instead of the translated label. Every Select in this
  // codebase needs this for the same reason (see the other call sites).
  const items = Object.fromEntries(
    SORT_OPTIONS.map((option) => [option, t(SORT_LABEL_KEYS[option])]),
  );

  return (
    <Select value={currentSort} onValueChange={handleChange} items={items}>
      <SelectTrigger aria-label={t("sortBy")} className="w-fit">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {t(SORT_LABEL_KEYS[option])}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
