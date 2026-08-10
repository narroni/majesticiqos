"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminCategoryOption } from "@/lib/data/admin-products";
import { buildFilterQueryString } from "@/lib/url-params";

const SEARCH_DEBOUNCE_MS = 400;

interface AdminProductFiltersProps {
  categories: AdminCategoryOption[];
}

export function AdminProductFilters({ categories }: AdminProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(patch: Record<string, string | undefined>) {
    const query = buildFilterQueryString(searchParams, patch);
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      navigate({ search: value || undefined });
    }, SEARCH_DEBOUNCE_MS);
  }

  // Base UI's <Select.Value> resolves the trigger's displayed label from
  // this `items` map (value -> label), not from the rendered <SelectItem>
  // children — without it, the closed trigger shows the raw value instead.
  const categoryItems = {
    all: "All categories",
    ...Object.fromEntries(categories.map((category) => [category.id, category.name])),
  };
  const stockItems = {
    all: "All stock levels",
    in_stock: "In stock",
    low_stock: "Low stock",
    out_of_stock: "Out of stock",
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="text-fg-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="Search products…"
          className="pl-9"
        />
      </div>

      <Select
        value={searchParams.get("category") ?? "all"}
        onValueChange={(value) => navigate({ category: value && value !== "all" ? value : undefined })}
        items={categoryItems}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("stock") ?? "all"}
        onValueChange={(value) => navigate({ stock: value && value !== "all" ? value : undefined })}
        items={stockItems}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="All stock levels" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All stock levels</SelectItem>
          <SelectItem value="in_stock">In stock</SelectItem>
          <SelectItem value="low_stock">Low stock</SelectItem>
          <SelectItem value="out_of_stock">Out of stock</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
