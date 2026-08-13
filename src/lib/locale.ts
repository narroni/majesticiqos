import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";

import { routing } from "@/i18n/routing";
import type { Locale } from "@/types";

// Every page/layout/metadata/opengraph-image function under src/app/[locale]
// receives `locale` as a bare string route param — Next can't statically
// restrict a dynamic segment to a union type, so nothing stops a request
// like /.env or /wp-admin (whatever didn't get caught earlier in the
// pipeline) from reaching here with an arbitrary value. Call this before
// using `locale` for anything: it's not just a display concern — it flows
// straight into Postgres `locale` enum columns in data/ queries, and an
// invalid value there throws a raw 22P02 "invalid input value for enum"
// error instead of a clean 404. [locale]/layout.tsx's own hasLocale check
// does NOT guarantee this for every page — Next can start rendering a page
// segment's data fetches before a sibling layout's notFound() has taken
// effect, so each entry point needs its own check.
export function requireLocale(locale: string): Locale {
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  return locale;
}
