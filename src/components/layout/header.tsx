"use client";

import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Suspense, useEffect, useState } from "react";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { SearchOverlay } from "@/components/layout/search-overlay";
import { Stagger } from "@/components/motion/stagger";
import { Container } from "@/components/shared/container";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { getCartItemCount, useCartStore } from "@/lib/stores/cart-store";
import { EXPANDED_TAP_TARGET } from "@/lib/tap-target";
import { cx } from "@/lib/utils";

const SCROLL_THRESHOLD = 40;

const NAV_ITEMS = [
  { key: "products", href: "/products" },
  { key: "categories", href: "/categories" },
] as const;

type Overlay = "menu" | "search" | null;

export function Header() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<Overlay>(null);
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
    if (!activeOverlay) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveOverlay(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeOverlay]);

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
        <Link href="/" className="shrink-0">
          <Image
            src="/logo.png"
            alt={siteConfig.name}
            width={40}
            height={40}
            priority
            className="h-10 w-10"
          />
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

        {/* pointer-coarse:gap-6: each icon's expanded 44px tap area (see
            EXPANDED_TAP_TARGET) extends 12px past its own edge — gap-4 (16px)
            alone would let two neighbouring hit areas overlap by 8px, so this
            widens the gap on touch just enough to keep them from touching. */}
        <div className="flex items-center gap-4 pointer-coarse:gap-6">
          <button
            type="button"
            aria-label={tCommon("search")}
            onClick={() => setActiveOverlay("search")}
            className={cx("text-fg-secondary hover:text-fg-primary", EXPANDED_TAP_TARGET)}
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
            className={cx("text-fg-secondary hover:text-fg-primary relative", EXPANDED_TAP_TARGET)}
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
            className={cx("text-fg-secondary hover:text-fg-primary lg:hidden", EXPANDED_TAP_TARGET)}
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </div>
      </Container>

      {activeOverlay === "search" && <SearchOverlay onClose={() => setActiveOverlay(null)} />}

      {activeOverlay === "menu" && (
        <div className="bg-bg-base fixed inset-0 z-50 flex flex-col">
          <Container className="flex h-16 items-center justify-between">
            <Image src="/logo.png" alt={siteConfig.name} width={36} height={36} className="h-9 w-9" />
            <button
              type="button"
              aria-label={tCommon("close")}
              onClick={() => setActiveOverlay(null)}
              className={cx("text-fg-secondary hover:text-fg-primary", EXPANDED_TAP_TARGET)}
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
