"use client";

import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { FilterFields } from "@/components/catalog/filter-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { CategoryWithCount } from "@/types";

const FILTER_PARAM_KEYS = ["category", "minPrice", "maxPrice", "inStockOnly"];

export function FilterSheet({
  categories,
}: {
  categories: CategoryWithCount[];
}) {
  const t = useTranslations("catalog");
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const activeCount = FILTER_PARAM_KEYS.filter((key) =>
    searchParams.has(key),
  ).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" className="lg:hidden" />}>
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        {t("filters")}
        {activeCount > 0 ? (
          <Badge variant="secondary">{activeCount}</Badge>
        ) : null}
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("filters")}</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          <FilterFields categories={categories} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
