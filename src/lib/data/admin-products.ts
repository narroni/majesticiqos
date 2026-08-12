import "server-only";

import { getStockStatus } from "@/lib/data/products";
import { createClient } from "@/lib/supabase/server";
import { normalizeForSearch } from "@/lib/utils";
import type { StockStatus } from "@/types";
import type { Tables } from "@/types/database";

// Admin reads always go through the cookie-aware, RLS-scoped client (never
// createPublicClient) — `products_admin_select` etc. already require
// is_admin(), so this is a second, independent enforcement layer on top of
// the admin layout's own check, and it must always be fresh (no ISR tags).

export interface AdminProductListItem {
  id: string;
  slug: string;
  nameSq: string;
  categoryName: string | null;
  priceCents: number;
  discountPriceCents: number | null;
  effectivePriceCents: number;
  stockQuantity: number;
  stockStatus: StockStatus;
  isActive: boolean;
  isFeatured: boolean;
  primaryImageUrl: string | null;
  /** Locales missing a name/short description/description. Empty when both are complete. */
  incompleteLocales: ("sq" | "en")[];
}

interface TranslationCompletenessFields {
  name: string;
  short_description: string | null;
  description: string | null;
}

// Shared "complete" definition — a translation is only complete once it has
// a name, short description, and description. Used both to compute a
// product's per-row warning in the list and to build the overview's
// translation-completeness widget.
function isTranslationComplete(translation?: TranslationCompletenessFields): boolean {
  return Boolean(
    translation?.name.trim() &&
      translation.short_description?.trim() &&
      translation.description?.trim(),
  );
}

// Batched lookup of which locale(s) are incomplete per product, keyed by id.
// A product absent from the map has both locales complete. Optionally
// scoped to a set of ids so the list page doesn't have to fetch this for
// every product on every page load.
async function getIncompleteLocalesByProductId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids?: string[],
): Promise<Map<string, ("sq" | "en")[]>> {
  let query = supabase
    .from("products")
    .select("id, product_translations(locale, name, short_description, description)")
    .is("deleted_at", null);

  if (ids) {
    query = query.in("id", ids);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const map = new Map<string, ("sq" | "en")[]>();

  for (const row of data) {
    const sq = row.product_translations.find((t) => t.locale === "sq");
    const en = row.product_translations.find((t) => t.locale === "en");
    const incomplete: ("sq" | "en")[] = [];
    if (!isTranslationComplete(sq)) incomplete.push("sq");
    if (!isTranslationComplete(en)) incomplete.push("en");
    if (incomplete.length > 0) {
      map.set(row.id, incomplete);
    }
  }

  return map;
}

export interface AdminProductImage {
  id: string;
  storagePath: string;
  altSq: string | null;
  altEn: string | null;
  sortOrder: number;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
}

export interface AdminProductDetail {
  id: string;
  slug: string;
  sku: string | null;
  categoryId: string | null;
  priceCents: number;
  discountPriceCents: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  isActive: boolean;
  isFeatured: boolean;
  nameSq: string;
  shortDescriptionSq: string;
  descriptionSq: string;
  metaTitleSq: string;
  metaDescriptionSq: string;
  nameEn: string;
  shortDescriptionEn: string;
  descriptionEn: string;
  metaTitleEn: string;
  metaDescriptionEn: string;
  images: AdminProductImage[];
}

export interface AdminCategoryOption {
  id: string;
  name: string;
}

export interface AdminProductFilters {
  search?: string;
  categoryId?: string;
  stockStatus?: StockStatus;
  /** Restricts to this exact set of ids — used by the overview's
   * translation-completeness widget to link to a pre-filtered list without
   * needing a dedicated query pipeline of its own. */
  productIds?: string[];
  page?: number;
  perPage?: number;
}

const LIST_COLUMNS = `
  id,
  slug,
  price_cents,
  discount_price_cents,
  effective_price_cents,
  stock_quantity,
  low_stock_threshold,
  track_inventory,
  is_active,
  is_featured,
  category_id,
  product_translations(name, locale),
  product_images(storage_path, sort_order),
  categories(category_translations(name, locale))
`;

interface ListRow {
  id: string;
  slug: string;
  price_cents: number;
  discount_price_cents: number | null;
  effective_price_cents: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  track_inventory: boolean;
  is_active: boolean;
  is_featured: boolean;
  category_id: string | null;
  product_translations: { name: string; locale: string }[];
  product_images: { storage_path: string; sort_order: number }[];
  categories: { category_translations: { name: string; locale: string }[] } | null;
}

const DEFAULT_PER_PAGE = 20;

export async function getAdminProducts(filters: AdminProductFilters = {}) {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const perPage = filters.perPage ?? DEFAULT_PER_PAGE;

  let query = supabase
    .from("products")
    .select(LIST_COLUMNS)
    .is("deleted_at", null)
    .eq("product_translations.locale", "sq")
    .order("created_at", { ascending: false });

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  if (filters.productIds) {
    query = query.in("id", filters.productIds);
  }

  if (filters.search) {
    // Matches the storefront's diacritic-insensitive search (§2.5) so an
    // admin typing "cante" still finds "Çantë".
    query = query.ilike(
      "product_translations.name_unaccented",
      `%${normalizeForSearch(filters.search)}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as ListRow[];
  const incompleteLocalesById = await getIncompleteLocalesByProductId(
    supabase,
    rows.map((row) => row.id),
  );

  let items: AdminProductListItem[] = rows.map((row) => {
    const translation = row.product_translations.find((t) => t.locale === "sq");
    const categoryName = row.categories?.category_translations.find(
      (t) => t.locale === "sq",
    )?.name;
    const images = [...row.product_images].sort((a, b) => a.sort_order - b.sort_order);

    return {
      id: row.id,
      slug: row.slug,
      nameSq: translation?.name ?? "(untranslated)",
      categoryName: categoryName ?? null,
      priceCents: row.price_cents,
      discountPriceCents: row.discount_price_cents,
      effectivePriceCents: row.effective_price_cents ?? row.price_cents,
      stockQuantity: row.stock_quantity,
      stockStatus: getStockStatus(row),
      isActive: row.is_active,
      isFeatured: row.is_featured,
      primaryImageUrl: images[0]?.storage_path ?? null,
      incompleteLocales: incompleteLocalesById.get(row.id) ?? [],
    };
  });

  if (filters.stockStatus) {
    items = items.filter((item) => item.stockStatus === filters.stockStatus);
  }

  const total = items.length;
  const from = (page - 1) * perPage;
  const paginated = items.slice(from, from + perPage);

  return { items: paginated, total, page, perPage };
}

const DETAIL_COLUMNS = `
  id,
  slug,
  sku,
  price_cents,
  discount_price_cents,
  stock_quantity,
  low_stock_threshold,
  track_inventory,
  is_active,
  is_featured,
  category_id,
  product_translations(name, short_description, description, meta_title, meta_description, locale),
  product_images(id, storage_path, alt_sq, alt_en, sort_order, width, height, blur_data_url)
`;

interface DetailRow {
  id: string;
  slug: string;
  sku: string | null;
  price_cents: number;
  discount_price_cents: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  track_inventory: boolean;
  is_active: boolean;
  is_featured: boolean;
  category_id: string | null;
  product_translations: {
    name: string;
    short_description: string | null;
    description: string | null;
    meta_title: string | null;
    meta_description: string | null;
    locale: string;
  }[];
  product_images: Tables<"product_images">[];
}

export async function getAdminProductById(id: string): Promise<AdminProductDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }

  const row = data as unknown as DetailRow;
  const sq = row.product_translations.find((t) => t.locale === "sq");
  const en = row.product_translations.find((t) => t.locale === "en");
  const images = [...row.product_images]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((image) => ({
      id: image.id,
      storagePath: image.storage_path,
      altSq: image.alt_sq,
      altEn: image.alt_en,
      sortOrder: image.sort_order,
      width: image.width,
      height: image.height,
      blurDataUrl: image.blur_data_url,
    }));

  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    categoryId: row.category_id,
    priceCents: row.price_cents,
    discountPriceCents: row.discount_price_cents,
    stockQuantity: row.stock_quantity,
    lowStockThreshold: row.low_stock_threshold,
    trackInventory: row.track_inventory,
    isActive: row.is_active,
    isFeatured: row.is_featured,
    nameSq: sq?.name ?? "",
    shortDescriptionSq: sq?.short_description ?? "",
    descriptionSq: sq?.description ?? "",
    metaTitleSq: sq?.meta_title ?? "",
    metaDescriptionSq: sq?.meta_description ?? "",
    nameEn: en?.name ?? "",
    shortDescriptionEn: en?.short_description ?? "",
    descriptionEn: en?.description ?? "",
    metaTitleEn: en?.meta_title ?? "",
    metaDescriptionEn: en?.meta_description ?? "",
    images,
  };
}

export async function getAdminCategoryOptions(): Promise<AdminCategoryOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, sort_order, category_translations(name, locale)")
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as {
    id: string;
    category_translations: { name: string; locale: string }[];
  }[]).map((row) => ({
    id: row.id,
    name: row.category_translations.find((t) => t.locale === "sq")?.name ?? "(untranslated)",
  }));
}

/**
 * The activation rule (BLUEPRINT §6.2, relaxed): a product can't be set
 * is_active unless it has at least one image. Translation completeness is
 * no longer a hard block — it's surfaced as a warning instead (see
 * `getIncompleteTranslationProductIds`). Re-checked here against live DB
 * state for the list page's inline toggle (which doesn't carry full
 * translation content the way the save-product form does).
 */
export async function isProductReadyForActive(id: string): Promise<boolean> {
  const product = await getAdminProductById(id);
  if (!product) {
    return false;
  }

  return product.images.length > 0;
}

// The overview's translation-completeness widget (BLUEPRINT §6.4) links
// here — same "complete" definition used by the list page's per-row
// warning, just batched across every non-deleted product instead of one.
export async function getIncompleteTranslationProductIds(): Promise<string[]> {
  const supabase = await createClient();
  const incompleteLocalesById = await getIncompleteLocalesByProductId(supabase);
  return [...incompleteLocalesById.keys()];
}

export async function isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const supabase = await createClient();

  let query = supabase.from("products").select("id").eq("slug", slug);
  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw error;
  }

  return data != null;
}
