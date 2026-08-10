import "server-only";

import { activeProductsQuery } from "@/lib/data/products";
import { createPublicClient } from "@/lib/supabase/public";
import type { CategorySummary, CategoryWithCount, Locale } from "@/types";

const CATEGORY_COLUMNS = `
  id,
  slug,
  image_url,
  sort_order,
  category_translations(name, description, locale)
`;

interface CategoryRow {
  id: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
  category_translations: {
    name: string;
    description: string | null;
    locale: Locale;
  }[];
}

function toCategorySummary(row: CategoryRow, locale: Locale): CategorySummary {
  const translation = row.category_translations.find(
    (t) => t.locale === locale,
  );

  return {
    id: row.id,
    slug: row.slug,
    name: translation?.name ?? "",
    description: translation?.description ?? null,
    imageUrl: row.image_url,
  };
}

// BLUEPRINT §1.2 — "home" context: revalidate 300, tag `home` (Home page
// use, e.g. CategoryTiles). "listing" context: no `home` tag, since this is
// also read from the products listing page's filter sidebar and shouldn't
// be invalidated by home-only edits.
export async function getCategories(
  locale: Locale,
  context: "home" | "listing" = "home",
): Promise<CategoryWithCount[]> {
  const listTags = context === "home" ? ["home", "categories"] : ["categories"];
  const countTags = context === "home" ? ["home", "products"] : ["products"];

  const listClient = createPublicClient({ revalidate: 300, tags: listTags });
  const countClient = createPublicClient({ revalidate: 300, tags: countTags });

  const [
    { data: categoryRows, error: categoryError },
    { data: countRows, error: countError },
  ] = await Promise.all([
    listClient
      .from("categories")
      .select(CATEGORY_COLUMNS)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    activeProductsQuery(countClient, "category_id"),
  ]);

  if (categoryError) {
    throw categoryError;
  }
  if (countError) {
    throw countError;
  }

  const counts = new Map<string, number>();
  for (const row of (countRows ?? []) as unknown as {
    category_id: string | null;
  }[]) {
    if (row.category_id) {
      counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
    }
  }

  return ((categoryRows ?? []) as unknown as CategoryRow[]).map((row) => ({
    ...toCategorySummary(row, locale),
    productCount: counts.get(row.id) ?? 0,
  }));
}

// BLUEPRINT §1.2 — Categories `/[locale]/categories/[slug]`: tag
// `category:{id}`, tagged by slug for the same reason as product detail —
// see products.ts and CLAUDE.md's caching rules.
export async function getCategoryBySlug(
  slug: string,
  locale: Locale,
): Promise<CategorySummary | null> {
  const supabase = createPublicClient({
    revalidate: 300,
    tags: [`category:${slug}`, "categories"],
  });

  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_COLUMNS)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return toCategorySummary(data as unknown as CategoryRow, locale);
}

export interface SitemapCategory {
  slug: string;
  updatedAt: string;
}

// app/sitemap.ts — build-time enumeration only, no cache directive.
export async function getSitemapCategories(): Promise<SitemapCategory[]> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("categories")
    .select("slug, updated_at")
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  return data.map((row) => ({ slug: row.slug, updatedAt: row.updated_at }));
}
