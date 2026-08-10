import { clsx, type ClassValue } from "clsx";

// cn() (tailwind-merge-backed, for merging a caller-supplied `className`
// prop) lives in its own file, src/lib/cn.ts — deliberately not here. See
// that file's comment for why: bundlers here tree-shake at file
// granularity, so keeping it in this file would drag tailwind-merge into
// every importer of `cx`/`formatPrice`/etc., even ones that never call `cn`.

/**
 * Use for classNames built entirely from this component's own conditional
 * logic — internal state toggles, variant branches — with no external
 * `className` prop merged in, so there's never a same-property conflict to
 * resolve. clsx alone (no tailwind-merge) is ~27 KB gzipped lighter
 * (BLUEPRINT §9.4 bundle audit); verified every current call site of this
 * shape against its actual callers before introducing this, rather than
 * assuming.
 */
export function cx(...inputs: ClassValue[]) {
  return clsx(inputs);
}

const ALBANIAN_CHAR_MAP: Record<string, string> = {
  ë: "e",
  Ë: "E",
  ç: "c",
  Ç: "C",
};

/**
 * slugify("Mbulesë Lëkure Çanta") -> "mbulese-lekure-canta"
 * slugify("Këpucë Sportive")      -> "kepuce-sportive"
 * slugify("Çmimi & Ofertat!")     -> "cmimi-ofertat"
 */
export function slugify(value: string): string {
  return value
    .replace(/[ëËçÇ]/g, (char) => ALBANIAN_CHAR_MAP[char])
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatPrice(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

const RELATIVE_TIME_DIVISIONS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

/** formatRelativeTime("...", "en") -> "12 minutes ago" / "in 3 days" */
export function formatRelativeTime(dateIso: string, locale = "en"): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diffSeconds = Math.round((new Date(dateIso).getTime() - Date.now()) / 1000);

  for (const [unit, secondsInUnit] of RELATIVE_TIME_DIVISIONS) {
    if (Math.abs(diffSeconds) >= secondsInUnit) {
      return rtf.format(Math.round(diffSeconds / secondsInUnit), unit);
    }
  }

  return rtf.format(diffSeconds, "second");
}

export function setCookie(name: string, value: string, maxAgeSeconds: number) {
  document.cookie = `${name}=${value};max-age=${maxAgeSeconds};path=/`;
}

/**
 * Diacritic-insensitive search normalisation — same NFD-strip approach as
 * slugify(), without the hyphenation, since search terms need spaces kept.
 *
 * normalizeForSearch("Përkujdesje") -> "perkujdesje"
 * normalizeForSearch("Çanta")       -> "canta"
 */
export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
