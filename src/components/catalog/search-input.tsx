"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";
import { buildFilterQueryString } from "@/lib/url-params";

const DEBOUNCE_MS = 400;

export function SearchInput() {
  const t = useTranslations("catalog");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("search") ?? "");

  const debouncedNavigate = useDebouncedCallback((next: string) => {
    const query = buildFilterQueryString(searchParams, {
      search: next || undefined,
    });
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, DEBOUNCE_MS);

  function handleChange(next: string) {
    setValue(next);
    debouncedNavigate(next);
  }

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search
        className="text-fg-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={tCommon("search")}
        className="pl-9"
      />
    </div>
  );
}
