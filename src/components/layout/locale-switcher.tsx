"use client";

import { Fragment } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cx, setCookie } from "@/lib/utils";

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function LocaleSwitcher() {
  const activeLocale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  function handleSwitch(nextLocale: (typeof routing.locales)[number]) {
    setCookie("NEXT_LOCALE", nextLocale, LOCALE_COOKIE_MAX_AGE);

    router.replace(
      { pathname, query: Object.fromEntries(searchParams) },
      { locale: nextLocale },
    );
  }

  return (
    <div className="flex items-center gap-2 font-mono text-xs tracking-[0.15em] uppercase">
      {routing.locales.map((locale, index) => (
        <Fragment key={locale}>
          {index > 0 && <span className="text-border-strong">|</span>}
          <button
            type="button"
            onClick={() => handleSwitch(locale)}
            aria-current={locale === activeLocale ? "true" : undefined}
            className={cx(
              "transition-colors",
              locale === activeLocale
                ? "text-accent"
                : "text-fg-muted hover:text-fg-secondary",
            )}
          >
            {locale.toUpperCase()}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
