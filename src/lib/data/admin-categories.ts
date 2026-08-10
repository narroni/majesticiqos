import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface AdminCategoryListItem {
  id: string;
  slug: string;
  nameSq: string;
  nameEn: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

interface CategoryListRow {
  id: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  category_translations: { name: string; locale: string }[];
}

export async function getAdminCategories(): Promise<AdminCategoryListItem[]> {
  const supabase = await createClient();

  const [{ data, error }, { data: productRows, error: productError }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, slug, image_url, sort_order, is_active, category_translations(name, locale)")
      .order("sort_order", { ascending: true }),
    // A separate, lightweight query rather than an embedded `products(count)`
    // — PostgREST's embedded-resource count aggregate can't be filtered to
    // `deleted_at is null` through the JS client's fluent API, and an
    // unfiltered count would show a category as "in use" by products that
    // are actually soft-deleted, disagreeing with the delete guard's own
    // (correctly filtered) count.
    supabase.from("products").select("category_id").is("deleted_at", null),
  ]);

  if (error) {
    throw error;
  }
  if (productError) {
    throw productError;
  }

  const countByCategory = new Map<string, number>();
  for (const row of productRows ?? []) {
    if (!row.category_id) continue;
    countByCategory.set(row.category_id, (countByCategory.get(row.category_id) ?? 0) + 1);
  }

  const rows = (data ?? []) as unknown as CategoryListRow[];

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    nameSq: row.category_translations.find((t) => t.locale === "sq")?.name ?? "(untranslated)",
    nameEn: row.category_translations.find((t) => t.locale === "en")?.name ?? "(untranslated)",
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    productCount: countByCategory.get(row.id) ?? 0,
  }));
}

export interface AdminCategoryDetail {
  id: string;
  slug: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  nameSq: string;
  descriptionSq: string;
  nameEn: string;
  descriptionEn: string;
}

interface CategoryDetailRow {
  id: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  category_translations: { name: string; description: string | null; locale: string }[];
}

export async function getAdminCategoryById(id: string): Promise<AdminCategoryDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, image_url, sort_order, is_active, category_translations(name, description, locale)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }

  const row = data as unknown as CategoryDetailRow;
  const sq = row.category_translations.find((t) => t.locale === "sq");
  const en = row.category_translations.find((t) => t.locale === "en");

  return {
    id: row.id,
    slug: row.slug,
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    nameSq: sq?.name ?? "",
    descriptionSq: sq?.description ?? "",
    nameEn: en?.name ?? "",
    descriptionEn: en?.description ?? "",
  };
}

export async function isCategorySlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const supabase = await createClient();

  let query = supabase.from("categories").select("id").eq("slug", slug);
  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw error;
  }

  return data != null;
}

/** Non-deleted products still referencing this category — the delete guard's source of truth. */
export async function getActiveProductCountForCategory(id: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }

  return count ?? 0;
}
