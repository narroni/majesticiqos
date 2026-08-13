"use client";

import { Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Container } from "@/components/shared/container";
import { siteConfig } from "@/config/site";
import { Link, useRouter } from "@/i18n/navigation";
import { searchProductsAction } from "@/lib/actions/search";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";
import { EXPANDED_TAP_TARGET } from "@/lib/tap-target";
import { formatPrice } from "@/lib/utils";
import type { Locale } from "@/types";
import type { ProductSearchHit } from "@/lib/data/products";

const DEBOUNCE_MS = 250;

interface SearchOverlayProps {
  onClose: () => void;
}

export function SearchOverlay({ onClose }: SearchOverlayProps) {
  const t = useTranslations("catalog");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  const [searchValue, setSearchValue] = useState("");
  const [results, setResults] = useState<ProductSearchHit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const debouncedSearch = useDebouncedCallback(
    (trimmed: string, searchLocale: Locale, requestId: number) => {
      setIsLoading(true);
      searchProductsAction(trimmed, searchLocale).then((hits) => {
        // A later keystroke may have started a newer request while this one
        // was in flight — ignore this response if it's no longer current.
        if (requestIdRef.current !== requestId) return;
        setResults(hits);
        setIsLoading(false);
        setHasSearched(true);
      });
    },
    DEBOUNCE_MS,
  );

  useEffect(() => {
    const trimmed = searchValue.trim();
    const requestId = ++requestIdRef.current;

    // Stale results/loading state from a previous, longer query is hidden
    // by the `trimmedValue` render guard below once the input is cleared,
    // so an empty query just needs to invalidate in-flight requests above —
    // no setState needed here.
    if (!trimmed) {
      return;
    }

    debouncedSearch(trimmed, locale, requestId);
  }, [searchValue, locale, debouncedSearch]);

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = searchValue.trim();
    router.push(trimmed ? `/products?search=${encodeURIComponent(trimmed)}` : "/products");
    onClose();
  }

  function handleResultClick() {
    onClose();
  }

  const trimmedValue = searchValue.trim();

  return (
    <div className="bg-bg-base fixed inset-0 z-50 flex flex-col overflow-y-auto">
      <Container className="flex h-16 shrink-0 items-center justify-between">
        <span className="font-display text-fg-primary text-lg tracking-[0.1em] uppercase">
          {siteConfig.name}
        </span>
        <button
          type="button"
          aria-label={tCommon("close")}
          onClick={onClose}
          className={`text-fg-secondary hover:text-fg-primary ${EXPANDED_TAP_TARGET}`}
        >
          <X className="size-6" aria-hidden="true" />
        </button>
      </Container>

      <Container className="flex flex-1 flex-col items-center gap-6 pt-4 pb-16 sm:pt-8">
        <form onSubmit={handleSearchSubmit} className="w-full max-w-xl">
          <div className="border-border-strong focus-within:border-accent relative flex items-center border-b transition-colors">
            <Search className="text-fg-muted size-5 shrink-0" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={tCommon("search")}
              className="text-fg-primary font-body placeholder:text-fg-muted w-full bg-transparent px-3 py-3 text-lg outline-none"
            />
          </div>
        </form>

        {trimmedValue ? (
          <div className="flex w-full max-w-xl flex-col gap-1">
            {results.length > 0 ? (
              <>
                <ul className="flex flex-col">
                  {results.map((hit) => (
                    <li key={hit.id}>
                      <Link
                        href={`/products/${hit.slug}`}
                        onClick={handleResultClick}
                        className="hover:bg-bg-elevated flex items-center gap-3 rounded-md px-2 py-2 transition-colors"
                      >
                        <div className="bg-bg-elevated relative size-12 shrink-0 overflow-hidden rounded-sm">
                          {hit.imageUrl ? (
                            <Image
                              src={hit.imageUrl}
                              alt={hit.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : null}
                        </div>
                        <span className="text-fg-primary font-body line-clamp-1 flex-1 text-sm">
                          {hit.name}
                        </span>
                        <span className="text-accent font-mono text-sm shrink-0">
                          {formatPrice(hit.effectivePriceCents, locale)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/products?search=${encodeURIComponent(trimmedValue)}`}
                  onClick={handleResultClick}
                  className="text-accent font-mono text-xs tracking-[0.1em] uppercase hover:underline mt-2 self-start px-2"
                >
                  {t("seeAllResults", { query: trimmedValue })}
                </Link>
              </>
            ) : hasSearched && !isLoading ? (
              <p className="text-fg-secondary font-body py-6 text-center text-sm">
                {t("noResults")}
              </p>
            ) : null}
          </div>
        ) : null}
      </Container>
    </div>
  );
}
