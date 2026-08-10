"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/navigation";
import { buildFilterQueryString } from "@/lib/url-params";
import type { CategoryWithCount } from "@/types";

const PRICE_DEBOUNCE_MS = 500;

interface FilterFieldsProps {
  categories: CategoryWithCount[];
}

export function FilterFields({ categories }: FilterFieldsProps) {
  const t = useTranslations("catalog");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get("category") ?? "all";
  const currentInStockOnly = searchParams.get("inStockOnly") === "true";

  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const priceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(patch: Record<string, string | boolean | undefined>) {
    const query = buildFilterQueryString(searchParams, patch);
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function handlePriceChange(field: "minPrice" | "maxPrice", raw: string) {
    if (field === "minPrice") {
      setMinPrice(raw);
    } else {
      setMaxPrice(raw);
    }

    if (priceTimeoutRef.current) {
      clearTimeout(priceTimeoutRef.current);
    }

    priceTimeoutRef.current = setTimeout(() => {
      navigate({ [field]: raw || undefined });
    }, PRICE_DEBOUNCE_MS);
  }

  // See sort-select.tsx's comment — Select.Value needs this `items` map to
  // show the matched label instead of the raw value on the closed trigger.
  const categoryItems: Record<string, string> = {
    all: t("allCategories"),
    ...Object.fromEntries(
      categories.map((category) => [category.slug, `${category.name} (${category.productCount})`]),
    ),
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label>{t("category")}</Label>
        <Select
          value={currentCategory}
          onValueChange={(value) =>
            navigate({
              category: value == null || value === "all" ? undefined : value,
            })
          }
          items={categoryItems}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCategories")}</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.slug}>
                {category.name} ({category.productCount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("priceRange")}</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            value={minPrice}
            onChange={(event) =>
              handlePriceChange("minPrice", event.target.value)
            }
            aria-label={t("minPrice")}
            placeholder={t("minPrice")}
          />
          <span className="text-fg-muted" aria-hidden="true">
            –
          </span>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            value={maxPrice}
            onChange={(event) =>
              handlePriceChange("maxPrice", event.target.value)
            }
            aria-label={t("maxPrice")}
            placeholder={t("maxPrice")}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="filter-in-stock-only"
          checked={currentInStockOnly}
          onCheckedChange={(checked) =>
            navigate({ inStockOnly: checked ? "true" : undefined })
          }
        />
        <Label htmlFor="filter-in-stock-only" className="font-normal">
          {t("inStockOnly")}
        </Label>
      </div>
    </div>
  );
}
