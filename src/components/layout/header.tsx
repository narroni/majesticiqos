"use client";

import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Stagger } from "@/components/motion/stagger";
import { Container } from "@/components/shared/container";
import { siteConfig } from "@/config/site";
import { Link, useRouter } from "@/i18n/navigation";
import { getCartItemCount, useCartStore } from "@/lib/stores/cart-store";
import { cx } from "@/lib/utils";

const SCROLL_THRESHOLD = 40;

const NAV_ITEMS = [
  { key: "products", href: "/products" },
  { key: "categories", href: "/categories" },
  { key: "about", href: "/about" },
] as const;

type Overlay = "menu" | "search" | null;

export function Header() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const tCatalog = useTranslations("catalog");
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<Overlay>(null);
  const [searchValue, setSearchValue] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cartCount = useCartStore((state) => getCartItemCount(state.items));
  const hasHydrated = useCartStore((state) => state.hasHydrated);

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = activeOverlay ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeOverlay]);

  useEffect(() => {
    if (activeOverlay === "search") {
      searchInputRef.current?.focus();
    }
  }, [activeOverlay]);

  useEffect(() => {
    if (!activeOverlay) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveOverlay(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeOverlay]);

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = searchValue.trim();
    router.push(trimmed ? `/products?search=${encodeURIComponent(trimmed)}` : "/products");
    setActiveOverlay(null);
    setSearchValue("");
  }

  return (
    <header
      className={cx(
        "sticky top-0 z-40 transition-colors duration-200",
        isScrolled
          ? "bg-bg-base/80 border-border border-b backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <Container className="flex h-16 items-center justify-between">
        <Link
          href="/"
          className="font-display text-fg-primary text-lg tracking-[0.1em] uppercase"
        >
          {siteConfig.name}
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="text-fg-secondary hover:text-fg-primary font-body text-sm transition-colors"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label={tCommon("search")}
            onClick={() => setActiveOverlay("search")}
            className="text-fg-secondary hover:text-fg-primary"
          >
            <Search className="size-5" aria-hidden="true" />
          </button>

          <div className="hidden sm:block">
            <Suspense fallback={null}>
              <LocaleSwitcher />
            </Suspense>
          </div>

          <Link
            href="/cart"
            aria-label={t("cart")}
            className="text-fg-secondary hover:text-fg-primary relative"
          >
            <ShoppingBag className="size-5" aria-hidden="true" />
            {hasHydrated && cartCount > 0 && (
              <span className="bg-accent text-bg-base absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[10px] leading-none">
                {cartCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            aria-label={t("menu")}
            onClick={() => setActiveOverlay("menu")}
            className="text-fg-secondary hover:text-fg-primary lg:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </div>
      </Container>

      {activeOverlay === "search" && (
        <div className="bg-bg-base fixed inset-0 z-50 flex flex-col">
          <Container className="flex h-16 items-center justify-between">
            <span className="font-display text-fg-primary text-lg tracking-[0.1em] uppercase">
              {siteConfig.name}
            </span>
            <button
              type="button"
              aria-label={tCommon("close")}
              onClick={() => setActiveOverlay(null)}
              className="text-fg-secondary hover:text-fg-primary"
            >
              <X className="size-6" aria-hidden="true" />
            </button>
          </Container>

          <Container className="flex flex-1 flex-col items-center justify-center gap-6">
            <form onSubmit={handleSearchSubmit} className="w-full max-w-xl">
              <div className="border-border-strong focus-within:border-accent relative flex items-center border-b transition-colors">
                <Search className="text-fg-muted size-5 shrink-0" aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder={tCatalog("searchPlaceholder")}
                  aria-label={tCommon("search")}
                  className="text-fg-primary font-body placeholder:text-fg-muted w-full bg-transparent px-3 py-3 text-lg outline-none"
                />
              </div>
            </form>
          </Container>
        </div>
      )}

      {activeOverlay === "menu" && (
        <div className="bg-bg-base fixed inset-0 z-50 flex flex-col">
          <Container className="flex h-16 items-center justify-between">
            <span className="font-display text-fg-primary text-lg tracking-[0.1em] uppercase">
              {siteConfig.name}
            </span>
            <button
              type="button"
              aria-label={tCommon("close")}
              onClick={() => setActiveOverlay(null)}
              className="text-fg-secondary hover:text-fg-primary"
            >
              <X className="size-6" aria-hidden="true" />
            </button>
          </Container>

          <Stagger className="flex flex-1 flex-col items-start justify-center gap-6 px-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setActiveOverlay(null)}
                className="text-h2 font-display text-fg-primary"
              >
                {t(item.key)}
              </Link>
            ))}
          </Stagger>
        </div>
      )}
    </header>
  );
}
